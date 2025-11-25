import { useState, useEffect } from "react";

import type { FC } from "react";

interface User {
  name: string;
  email: string;
  age: number;
}

interface UserProfileProps {
  userId: string;
  onUpdate?: () => void;
}

export const UserProfile: FC<UserProfileProps> = ({ userId, onUpdate }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setUser({
        name: `User ${userId}`,
        email: `user${userId}@example.com`,
        age: 25 + parseInt(userId),
      });
      setLoading(false);
    }, 100);
  }, [userId]);

  const handleSave = () => {
    setEditMode(false);
    onUpdate?.();
  };

  if (loading) {
    return <div>Loading user {userId}...</div>;
  }

  if (!user) {
    return <div>User not found</div>;
  }

  return (
    <div>
      <h2>User Profile</h2>
      {editMode ? (
        <div>
          <input
            value={user.name}
            onChange={(e) => {
              setUser({ ...user, name: e.target.value });
            }}
          />
          <input
            value={user.email}
            onChange={(e) => {
              setUser({ ...user, email: e.target.value });
            }}
          />
          <input
            type="number"
            value={user.age}
            onChange={(e) => {
              const parsedAge = parseInt(e.target.value);

              setUser({
                ...user,
                age: Number.isNaN(parsedAge) ? 0 : parsedAge,
              });
            }}
          />
          <button onClick={handleSave}>Save</button>
          <button
            onClick={() => {
              setEditMode(false);
            }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <div>
          <p>Name: {user.name}</p>
          <p>Email: {user.email}</p>
          <p>Age: {user.age}</p>
          <button
            onClick={() => {
              setEditMode(true);
            }}
          >
            Edit
          </button>
        </div>
      )}
    </div>
  );
};
