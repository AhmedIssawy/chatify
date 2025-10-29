import { useState, useEffect } from "react";
import { X, Settings, Users, UserPlus, UserMinus, Trash2, Image as ImageIcon } from "lucide-react";
import { useGroupStore } from "../store/useGroupStore";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

function GroupSettingsModal({ isOpen, onClose, group }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [groupPic, setGroupPic] = useState(null);
  const [groupPicPreview, setGroupPicPreview] = useState("");
  const [settings, setSettings] = useState({});
  const [availableUsers, setAvailableUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { updateGroupSettings, addGroupMembers, removeGroupMember, deleteGroup } = useGroupStore();

  useEffect(() => {
    if (isOpen && group) {
      setName(group.name);
      setDescription(group.description || "");
      setGroupPicPreview(group.groupPic || "");
      setSettings(group.settings);
      fetchAvailableUsers();
    }
  }, [isOpen, group]);

  const fetchAvailableUsers = async () => {
    try {
      const res = await axiosInstance.get("/messages/users");
      // Filter out users who are already members
      const nonMembers = res.data.filter(
        (user) => !group.members.some((member) => member._id === user._id)
      );
      setAvailableUsers(nonMembers);
    } catch (error) {
      toast.error("Failed to load users");
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setGroupPic(reader.result);
      setGroupPicPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateSettings = async () => {
    setIsLoading(true);
    try {
      await updateGroupSettings(group._id, {
        name: name.trim(),
        description: description.trim(),
        groupPic,
        settings,
      });
    } catch (error) {
      // Error handled in store
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMember = async (userId) => {
    try {
      await addGroupMembers(group._id, [userId]);
      fetchAvailableUsers();
    } catch (error) {
      // Error handled in store
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (window.confirm("Are you sure you want to remove this member?")) {
      try {
        await removeGroupMember(group._id, memberId);
        fetchAvailableUsers();
      } catch (error) {
        // Error handled in store
      }
    }
  };

  const handleDeleteGroup = async () => {
    if (window.confirm("Are you sure you want to delete this group? This action cannot be undone.")) {
      try {
        await deleteGroup(group._id);
        onClose();
      } catch (error) {
        // Error handled in store
      }
    }
  };

  const filteredUsers = availableUsers.filter((user) =>
    user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen || !group) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 rounded-lg">
              <Settings className="w-6 h-6 text-cyan-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                Group Settings
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Manage {group.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Group Picture */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                {groupPicPreview ? (
                  <img
                    src={groupPicPreview}
                    alt="Group"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Users className="w-10 h-10 text-slate-400" />
                )}
              </div>
              <label className="absolute bottom-0 right-0 p-2 bg-cyan-500 text-white rounded-full cursor-pointer hover:bg-cyan-600 transition-colors shadow-lg">
                <ImageIcon className="w-4 h-4" />
                <input
                  type="file"
                  onChange={handleImageChange}
                  accept="image/*"
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Group Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-cyan-500"
                maxLength={100}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-cyan-500 resize-none"
                maxLength={500}
              />
            </div>
          </div>

          {/* Settings Toggles */}
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Group Settings</h3>
            
            <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <span className="text-sm text-slate-700 dark:text-slate-300">Allow members to send messages</span>
              <input
                type="checkbox"
                checked={settings.allowMemberMessages}
                onChange={(e) => setSettings({ ...settings, allowMemberMessages: e.target.checked })}
                className="w-5 h-5 text-cyan-500 rounded focus:ring-cyan-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <span className="text-sm text-slate-700 dark:text-slate-300">Allow members to invite others</span>
              <input
                type="checkbox"
                checked={settings.allowMemberInvites}
                onChange={(e) => setSettings({ ...settings, allowMemberInvites: e.target.checked })}
                className="w-5 h-5 text-cyan-500 rounded focus:ring-cyan-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <span className="text-sm text-slate-700 dark:text-slate-300">Allow members to leave</span>
              <input
                type="checkbox"
                checked={settings.allowMemberLeave}
                onChange={(e) => setSettings({ ...settings, allowMemberLeave: e.target.checked })}
                className="w-5 h-5 text-cyan-500 rounded focus:ring-cyan-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <span className="text-sm text-slate-700 dark:text-slate-300">Private group</span>
              <input
                type="checkbox"
                checked={settings.isPrivate}
                onChange={(e) => setSettings({ ...settings, isPrivate: e.target.checked })}
                className="w-5 h-5 text-cyan-500 rounded focus:ring-cyan-500"
              />
            </label>

            <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <label className="block text-sm text-slate-700 dark:text-slate-300 mb-2">
                Max members: {settings.maxMembers}
              </label>
              <input
                type="range"
                min="2"
                max="1000"
                value={settings.maxMembers}
                onChange={(e) => setSettings({ ...settings, maxMembers: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>

          {/* Current Members */}
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">
              Members ({group.members.length})
            </h3>
            <div className="border border-slate-200 dark:border-slate-600 rounded-lg max-h-48 overflow-y-auto">
              {group.members.map((member) => (
                <div
                  key={member._id}
                  className="p-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-700 last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={member.profilePic || "/avatar.png"}
                      alt={member.fullName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-medium text-slate-800 dark:text-slate-100">
                        {member.fullName}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {member.email}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveMember(member._id)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Remove member"
                  >
                    <UserMinus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Add Members */}
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">
              Add Members
            </h3>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search users to add..."
              className="w-full px-4 py-2 mb-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-cyan-500"
            />
            <div className="border border-slate-200 dark:border-slate-600 rounded-lg max-h-48 overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <div className="p-4 text-center text-slate-500 dark:text-slate-400 text-sm">
                  No users available to add
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div
                    key={user._id}
                    className="p-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-700 last:border-b-0"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={user.profilePic || "/avatar.png"}
                        alt={user.fullName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-medium text-slate-800 dark:text-slate-100">
                          {user.fullName}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddMember(user._id)}
                      className="p-2 text-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 rounded-lg transition-colors"
                      title="Add member"
                    >
                      <UserPlus className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex gap-3 flex-shrink-0 bg-white dark:bg-slate-800">
          <button
            onClick={handleDeleteGroup}
            disabled={isLoading}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            Delete Group
          </button>
          <div className="flex-1" />
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleUpdateSettings}
            disabled={isLoading}
            className="px-4 py-2 bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default GroupSettingsModal;
