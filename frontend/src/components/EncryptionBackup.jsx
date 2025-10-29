/**
 * EncryptionBackup.jsx - Multi-device support for encryption keys
 * 
 * Allows users to:
 * - Export their encryption keys as an encrypted backup
 * - Import keys on a new device (like WhatsApp multi-device)
 * - Download backup file or display QR code
 */

import { useState } from "react";
import { X, Download, Upload, Key, Smartphone, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import toast from "react-hot-toast";

function EncryptionBackup({ onClose }) {
  const { exportEncryptionBackup, importEncryptionBackup } = useAuthStore();
  
  const [mode, setMode] = useState("menu"); // menu, export, import
  const [backupPassword, setBackupPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [backupData, setBackupData] = useState("");
  const [importData, setImportData] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleExport = async (e) => {
    e.preventDefault();
    
    if (backupPassword.length < 8) {
      toast.error("Backup password must be at least 8 characters");
      return;
    }
    
    if (backupPassword !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    setIsProcessing(true);
    try {
      const backup = await exportEncryptionBackup(backupPassword);
      if (backup) {
        setBackupData(backup);
        setExportSuccess(true);
      }
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadBackup = () => {
    const blob = new Blob([backupData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chatify-encryption-backup-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Backup downloaded!");
  };

  const handleCopyBackup = () => {
    navigator.clipboard.writeText(backupData);
    toast.success("Backup copied to clipboard!");
  };

  const handleImport = async (e) => {
    e.preventDefault();
    
    if (!importData) {
      toast.error("Please paste your backup data");
      return;
    }
    
    if (!backupPassword) {
      toast.error("Please enter your backup password");
      return;
    }

    setIsProcessing(true);
    try {
      const success = await importEncryptionBackup(importData, backupPassword);
      if (success) {
        toast.success("Keys imported successfully! 🎉");
        setTimeout(onClose, 1500);
      }
    } catch (error) {
      console.error("Import failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImportData(event.target.result);
        toast.success("Backup file loaded");
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Key className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Encryption Backup
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Multi-device support
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {mode === "menu" && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">
                      Use on Multiple Devices
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Export your encryption keys to use Chatify on another device. Your keys are encrypted with a password you choose.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setMode("export")}
                className="w-full flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-left"
              >
                <Download className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                <div>
                  <div className="font-medium text-slate-900 dark:text-slate-100">Export Keys</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    Create encrypted backup for new device
                  </div>
                </div>
              </button>

              <button
                onClick={() => setMode("import")}
                className="w-full flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-left"
              >
                <Upload className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                <div>
                  <div className="font-medium text-slate-900 dark:text-slate-100">Import Keys</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    Restore backup from another device
                  </div>
                </div>
              </button>
            </div>
          )}

          {mode === "export" && !exportSuccess && (
            <form onSubmit={handleExport} className="space-y-4">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-700 dark:text-yellow-300">
                    <strong>Important:</strong> Choose a strong password. You'll need it to import this backup on another device.
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Backup Password
                </label>
                <input
                  type="password"
                  value={backupPassword}
                  onChange={(e) => setBackupPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-100"
                  placeholder="Enter a strong password"
                  required
                  minLength={8}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-100"
                  placeholder="Confirm password"
                  required
                  minLength={8}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setMode("menu")}
                  className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isProcessing ? "Creating..." : "Create Backup"}
                </button>
              </div>
            </form>
          )}

          {mode === "export" && exportSuccess && (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-green-700 dark:text-green-300">
                    <strong>Backup created!</strong> Download the file or copy the data to transfer to your other device.
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Backup Data
                </label>
                <textarea
                  value={backupData}
                  readOnly
                  className="w-full h-32 px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-mono dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleDownloadBackup}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                <button
                  onClick={handleCopyBackup}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Copy
                </button>
              </div>

              <button
                onClick={() => {
                  setMode("menu");
                  setExportSuccess(false);
                  setBackupData("");
                  setBackupPassword("");
                  setConfirmPassword("");
                }}
                className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                Done
              </button>
            </div>
          )}

          {mode === "import" && (
            <form onSubmit={handleImport} className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  Import your encryption backup from another device. You'll need the backup file and password.
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Upload Backup File
                </label>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Or Paste Backup Data
                </label>
                <textarea
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  className="w-full h-32 px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-mono dark:text-slate-100"
                  placeholder='{"version":1,"userId":"...","publicKeyPem":"...",...}'
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Backup Password
                </label>
                <input
                  type="password"
                  value={backupPassword}
                  onChange={(e) => setBackupPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-100"
                  placeholder="Enter backup password"
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setMode("menu")}
                  className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isProcessing ? "Importing..." : "Import Keys"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default EncryptionBackup;
