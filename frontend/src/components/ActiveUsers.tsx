// src/components/ActiveUsers.tsx
import React from "react";
import { UserGroupIcon, UserIcon } from "@heroicons/react/24/outline";

interface ActiveUsersProps {
  users: string[];
  maxDisplay?: number;
}

const ActiveUsers: React.FC<ActiveUsersProps> = ({ users, maxDisplay = 5 }) => {
  const displayUsers = users.slice(0, maxDisplay);
  const remainingCount = users.length - maxDisplay;

  if (users.length === 0) {
    return (
      <div className="flex items-center space-x-2 text-gray-500">
        <UserIcon className="w-5 h-5" />
        <span className="text-sm">No active users</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-3">
      <div className="flex items-center space-x-1">
        <UserGroupIcon className="w-5 h-5 text-green-600" />
        <span className="text-sm font-medium text-gray-700">
          {users.length} active
        </span>
      </div>

      <div className="flex items-center space-x-2">
        {/* User avatars */}
        <div className="flex -space-x-2">
          {displayUsers.map((userEmail, index) => (
            <div key={userEmail} className="relative" title={userEmail}>
              <div className="flex items-center justify-center w-8 h-8 text-xs font-medium text-white border-2 border-white rounded-full shadow-sm bg-gradient-to-r from-blue-500 to-purple-600">
                {userEmail.charAt(0).toUpperCase()}
              </div>
              {index === 0 && (
                <div className="absolute w-3 h-3 bg-green-500 border-2 border-white rounded-full -top-1 -right-1"></div>
              )}
            </div>
          ))}

          {remainingCount > 0 && (
            <div className="flex items-center justify-center w-8 h-8 text-xs font-medium text-gray-600 bg-gray-300 border-2 border-white rounded-full shadow-sm">
              +{remainingCount}
            </div>
          )}
        </div>

        {/* Dropdown with full user list */}
        {users.length > 0 && (
          <div className="relative group">
            <button className="text-xs text-blue-600 hover:text-blue-800 focus:outline-none">
              View all
            </button>

            <div className="absolute right-0 z-10 invisible w-64 mt-2 transition-all duration-200 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 top-full group-hover:opacity-100 group-hover:visible">
              <div className="p-3">
                <h4 className="mb-2 text-sm font-medium text-gray-900">
                  Active Collaborators ({users.length})
                </h4>
                <div className="space-y-2 overflow-y-auto max-h-48">
                  {users.map((userEmail, index) => (
                    <div
                      key={userEmail}
                      className="flex items-center space-x-2"
                    >
                      <div className="flex items-center justify-center w-6 h-6 text-xs font-medium text-white rounded-full bg-gradient-to-r from-blue-500 to-purple-600">
                        {userEmail.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm text-gray-700 truncate">
                        {userEmail}
                      </span>
                      {index === 0 && (
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActiveUsers;
