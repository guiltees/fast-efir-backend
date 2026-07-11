const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RULES_PATH = path.join(__dirname, '../data/scam_rules.json');
const PRIVATE_KEY_PATH = path.join(__dirname, '../keys/private.pem');

let privateKey = null;
try {
    privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
} catch (err) {
    console.warn('[RuleRepository] Warning: private.pem not found. Signatures will fail.');
}

/**
 * Reads the latest rules from disk, signs them, and returns the envelope.
 */
exports.getLatestRules = () => {
    const rawRules = fs.readFileSync(RULES_PATH, 'utf8');
    const rules = JSON.parse(rawRules);
    
    const version = 1; // In a real system, this could be read from a DB or metadata file
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days from now
    
    const payloadToSign = JSON.stringify({ version, rules, expires });
    
    let signature = null;
    if (privateKey) {
        const sign = crypto.createSign('SHA256');
        sign.update(payloadToSign);
        sign.end();
        signature = sign.sign(privateKey, 'base64');
    }
    
    return {
        version,
        expires,
        signature,
        rules
    };
};
