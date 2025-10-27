import { useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import UsersLoadingSkeleton from "./UsersLoadingSkeleton";
import { useAuthStore } from "../store/useAuthStore";

function UserList() {
  const { getAllUsers, allUsers, setSelectedUser, isUsersLoading } = useChatStore();
  const { onlineUsers } = useAuthStore();

  useEffect(() => {
    getAllUsers();
  }, [getAllUsers]);

  if (isUsersLoading) return <UsersLoadingSkeleton />;

  return (
    <>
      {allUsers.map((user) => (
        <div
          key={user._id}
          className="bg-cyan-500/10 p-4 rounded-lg cursor-pointer hover:bg-cyan-500/20 transition-colors"
          onClick={() => setSelectedUser(user)}
        >
          <div className="flex items-center gap-3">
            <div className={`avatar ${onlineUsers.includes(user._id) ? "online" : "offline"}`}>
              <div className="size-12 rounded-full">
                <img src={user.profilePic || "/avatar.png"} />
              </div>
            </div>
            <h4 className="text-slate-200 font-medium">{user.fullName}</h4>
          </div>
        </div>
      ))}
    </>
  );
}
export default UserList;
