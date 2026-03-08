"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CredGateError = exports.ErrorCode = void 0;
// ─────────────────────────────────────────────────────────────────────────────
// Error handling
// ─────────────────────────────────────────────────────────────────────────────
var ErrorCode;
(function (ErrorCode) {
    ErrorCode["COOLDOWN_ACTIVE"] = "COOLDOWN_ACTIVE";
    ErrorCode["ANALYSIS_TIMEOUT"] = "ANALYSIS_TIMEOUT";
    ErrorCode["WALLET_NOT_FOUND"] = "WALLET_NOT_FOUND";
    ErrorCode["PROOF_FAILED"] = "PROOF_FAILED";
    ErrorCode["UNAUTHORIZED"] = "UNAUTHORIZED";
    ErrorCode["NETWORK_ERROR"] = "NETWORK_ERROR";
    ErrorCode["UNKNOWN"] = "UNKNOWN";
})(ErrorCode || (exports.ErrorCode = ErrorCode = {}));
class CredGateError extends Error {
    constructor(code, message, meta) {
        super(message);
        this.code = code;
        this.meta = meta;
        this.name = "CredGateError";
    }
}
exports.CredGateError = CredGateError;
//# sourceMappingURL=types.js.map