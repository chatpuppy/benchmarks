var crypto        = require('crypto');
var assert        = require('assert');
var Benchmark     = require('benchmark');
var tweetnacl     = require('tweetnacl');
var sodium        = require('sodium');

var base64_to_Uint8Array = function(input) {
  var raw = Buffer.from(input, 'base64');
  var arr = new Uint8Array(new ArrayBuffer(raw.length));
  for(i = 0; i < raw.length; i++) {
    arr[i] = raw[i];
  }
  return arr;
};

var string_to_Uint8Array = function(str) {
  var raw = Buffer.from(str, 'utf8');
  var arr = new Uint8Array(new ArrayBuffer(raw.length));
  for(i = 0; i < raw.length; i++) {
    arr[i] = raw[i];
  }
  return arr;
};

var _seed     = 'Aav6yqemxoPNNqxeKJXMlruKxXEHLD931S8pXzxt4mk=';
var _pubkey   = 'DsWygyoTcB7/NT5OqRzT0eaFf+6bJBSSBRfDOyU3x9k=';
var _message  = "Hi, this is a string that I want signed, will keep it short";
var _sig      = 'IvmJ8ntaMtcoVaU3lDToeQPdG/CdL7an4r013gYgJbY+eXJiwVZ9IxU/OC5htH41x2ezZRd83rTwe2+jf1f3CQ==';

/*********************** TweetNaCl tests ***************************/

class test_tweetnacl {
	constructor(nacl) {
		this.nacl = nacl;
		this._seed = base64_to_Uint8Array(_seed);
		this.key = null;
		this._pubkey = base64_to_Uint8Array(_pubkey);
		this._message = string_to_Uint8Array(_message);
		this.sig = null;
		this._sig = base64_to_Uint8Array(_sig);
	}
	fromSeed() {
		this.key = this.nacl.sign.keyPair.fromSeed(this._seed);
	}
	sign() {
		this.sig = this.nacl.sign.detached(this._message, this.key.secretKey);
	}
	verify() {
		var r = this.nacl.sign.detached.verify(this._message, this.sig, this._pubkey);
		assert(r, "Verification failed!");
	}
	validate() {
		assert(Buffer.from(this.key.publicKey).toString('base64') === _pubkey, "wrong public key");
		assert(Buffer.from(this.sig).toString('base64') === _sig, "wrong signature");
	}
	encrypt() {
		const ephemeralKeyPair = this.nacl.box.keyPair();
		const nonce = this.nacl.randomBytes(this.nacl.box.nonceLength);
		const encryptedMessage = this.nacl.box(
			this._message,
			nonce,
			this._pubkey,
			ephemeralKeyPair.secretKey,
		);
	}
}

function encrypt ({
	publicKey,
	data,
	version,
}) {
	if (isNullish(publicKey)) {
    throw new Error('Missing publicKey parameter');
  } else if (isNullish(data)) {
    throw new Error('Missing data parameter');
  } else if (isNullish(version)) {
    throw new Error('Missing version parameter');
  }
	switch (version) {
    case 'x25519-xsalsa20-poly1305': {
			if (typeof data !== 'string') {
        throw new Error('Message data must be given as a string');
      }
			let pubKeyUInt8Array;
      try {
        pubKeyUInt8Array = base64_to_Uint8Array(publicKey); 
      } catch (err) {
        throw new Error('Bad public key');
      }

			const msgParamsUInt8Array = string_to_Uint8Array(data);



		}
		default:
      throw new Error('Encryption type/version not supported');
  }
}
/*********************** Sodium tests ***************************/

class test_sodium {
	constructor() {
		this._seed = base64_to_Uint8Array(_seed);
		this.pubkey_ = base64_to_Uint8Array(_pubkey);
		this.message_ = string_to_Uint8Array(_message);
		this.key = null;
	}
	fromSeed() {
		this.key = new sodium.Key.Sign.fromSeed(_seed, 'base64');
	}
	sign() {
		// Detached signatures: https://github.com/paixaop/node-sodium/issues/22
		var signer = new sodium.Sign(this.key);
		var sig = signer.sign(_message, 'utf8');
		this.sig = sig.sign.slice(0, 64).toString('base64');
	}
	verify() {
		var input = {
			sign: Buffer.concat([
				Buffer.from(this.sig, 'base64'),
				Buffer.from(_message, 'utf8')
			]),
			publicKey: new Buffer.from(_pubkey, 'base64')
		};
		var r = sodium.Sign.verify(input);
		assert(r, "Verification failed!");
	}
	validate() {
		assert(Buffer.from(this.key.pk().get()).toString('base64') === _pubkey, "wrong public key");
		assert(this.sig === _sig, "wrong signature");
	}
	encrypt() {
		// Refer: https://github.com/paixaop/node-sodium#low-level-api
		const ephemeralKeyPair = sodium.api.crypto_box_keypair();
		const nonce = Buffer.allocUnsafe(sodium.api.crypto_box_NONCEBYTES);
		const encryptedMessage = sodium.api.crypto_box(
			this.message_,
			nonce,
			this.pubkey_,
			ephemeralKeyPair.secretKey,
		);
	}
}

/*********************** Actual tests ***************************/
console.log("Correctness Testing:");

console.log(" - testing sodium");
var sod = new test_sodium();
sod.fromSeed();
sod.sign();
sod.verify();
sod.validate();
sod.encrypt();

console.log(" - testing tweetnacl");
var tw1 = new test_tweetnacl(tweetnacl);
tw1.fromSeed();
tw1.sign();
tw1.verify();
tw1.validate();
tw1.encrypt();

/*********************** Benchmark HMAC-256 ***************************/
console.log("\nBrenchmark HMAC (from crypto):");

new Benchmark.Suite()
.add('HMAC-256 (crypto)', function() {
  crypto.createHmac('SHA256', _pubkey).update(_message).digest('base64');
})
.add('HMAC-512 (crypto)', function() {
  crypto.createHmac('SHA512', _pubkey).update(_message).digest('base64');
})
.on('cycle', function(event) {
  console.log(String(event.target));
})
.run();


/*********************** Benchmark FromSeed ***************************/
console.log("\nBrenchmark FromSeed:");

new Benchmark.Suite()
.add('sodium.fromSeed', function() {
  sod.fromSeed();
})
.add('tweetnacl.fromSeed', function() {
  tw1.fromSeed();
})
.on('cycle', function(event) {
  console.log(String(event.target));
})
.on('complete', function() {
  // console.log('Fastest is ' + this.filter('fastest').pluck('name'));
})
.run();

/*********************** Benchmark sign ***************************/
console.log("\nBrenchmark Sign:");

new Benchmark.Suite()
.add('sodium.sign', function() {
  sod.sign();
})
.add('tweetnacl.sign', function() {
  tw1.sign();
})
.on('cycle', function(event) {
  console.log(String(event.target));
})
.on('complete', function() {
  // console.log('Fastest is ' + this.filter('fastest').pluck('name'));
})
.run();

/*********************** Benchmark verify ***************************/
console.log("\nBrenchmark Verify:");

new Benchmark.Suite()
.add('sodium.verify', function() {
  sod.verify();
})
.add('tweetnacl.verify', function() {
  tw1.verify();
})
.on('cycle', function(event) {
  console.log(String(event.target));
})
.on('complete', function() {
  // console.log('Fastest is ' + this.filter('fastest').pluck('name'));
})
.run();

console.log("\nBrenchmark encrypt message");

new Benchmark.Suite()
.add('sodium.encrypt', function() {
	sod.encrypt();
})
.add("tweetnacl.encrypt", function() {
	tw1.encrypt();
})
.on('cycle', function(event) {
	console.log(String(event.target));
})
.on('complete', function() {

})
.run();

console.log("\nDone");