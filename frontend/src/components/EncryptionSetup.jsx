/**
 * EncryptionSetup Component
 * 
 * Prompts users to set up or unlock end-to-end encryption.
 * This component should be shown:
 * - During first login (if no keys exist)
 * - When trying to send a message without unlocked encryption
 * - As an option in settings
 */

import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { X, Lock, Key, Shield } from "lucide-react";

const EncryptionSetup = ({ onClose, mode = "setup" }) => {
  const [passphrase, setPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { setupEncryption, unlockEncryption } = useAuthStore();

  const isSetupMode = mode === "setup";

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSetupMode) {
      // Setup mode: create new keys
      if (passphrase.length < 8) {
        alert("Passphrase must be at least 8 characters long");
        return;
      }

      if (passphrase !== confirmPassphrase) {
        alert("Passphrases don't match");
        return;
      }

      setIsLoading(true);
      const success = await setupEncryption(passphrase);
      setIsLoading(false);

      if (success) {
        onClose();
      }
    } else {
      // Unlock mode: load existing keys
      setIsLoading(true);
      const success = await unlockEncryption(passphrase);
      setIsLoading(false);

      if (success) {
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-base-100 rounded-lg shadow-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {isSetupMode ? (
              <Shield className="w-6 h-6 text-primary" />
            ) : (
              <Lock className="w-6 h-6 text-primary" />
            )}
            <h2 className="text-xl font-bold">
              {isSetupMode ? "Enable End-to-End Encryption" : "Unlock Encryption"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Description */}
        <div className="mb-6 space-y-2">
          {isSetupMode ? (
            <>
              <p className="text-sm text-base-content/70">
                Protect your messages with end-to-end encryption. Only you and your recipients can
                read your messages.
              </p>
              <div className="alert alert-warning text-sm">
                <Key className="w-4 h-4" />
                <span>
                  <strong>Important:</strong> Your passphrase cannot be recovered. Store it securely!
                </span>
              </div>
            </>
          ) : (
            <p className="text-sm text-base-content/70">
              Enter your passphrase to unlock encryption and decrypt your messages.
            </p>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Encryption Passphrase</span>
            </label>
            <input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Enter a strong passphrase"
              className="input input-bordered"
              required
              minLength={isSetupMode ? 8 : 1}
              disabled={isLoading}
            />
            {isSetupMode && (
              <label className="label">
                <span className="label-text-alt">At least 8 characters</span>
              </label>
            )}
          </div>

          {isSetupMode && (
            <div className="form-control">
              <label className="label">
                <span className="label-text">Confirm Passphrase</span>
              </label>
              <input
                type="password"
                value={confirmPassphrase}
                onChange={(e) => setConfirmPassphrase(e.target.value)}
                placeholder="Re-enter your passphrase"
                className="input input-bordered"
                required
                minLength={8}
                disabled={isLoading}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost flex-1"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary flex-1" disabled={isLoading}>
              {isLoading ? (
                <span className="loading loading-spinner"></span>
              ) : isSetupMode ? (
                "Enable Encryption"
              ) : (
                "Unlock"
              )}
            </button>
          </div>
        </form>

        {/* Additional info */}
        {isSetupMode && (
          <div className="mt-6 pt-4 border-t border-base-300">
            <h3 className="font-semibold text-sm mb-2">How it works:</h3>
            <ul className="text-xs text-base-content/70 space-y-1">
              <li>• Your passphrase encrypts your private key locally</li>
              <li>• Private keys never leave your device</li>
              <li>• Messages are encrypted before sending</li>
              <li>• Only recipients with their private keys can decrypt</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default EncryptionSetup;
