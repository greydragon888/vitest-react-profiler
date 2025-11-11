import { useState, useEffect } from "react";

import type { FC } from "react";

interface DataFetcherProps {
  userId?: string;
  shouldFail?: boolean;
}

interface User {
  id: string;
  name: string;
  email: string;
}

/**
 * DataFetcher - demonstrates data fetching with loading/success/error states
 *
 * Use case: Testing components that load data from APIs
 *
 * Render phases:
 * 1. Mount (loading state)
 * 2. Update (data loaded or error)
 *
 * @example
 * ```tsx
 * const ProfiledFetcher = withProfiler(DataFetcher);
 * await ProfiledFetcher.waitForNextRender(); // Wait for data load
 * expect(ProfiledFetcher).toHaveRenderedTimes(2); // mount + update
 * ```
 */
export const DataFetcher: FC<DataFetcherProps> = ({
  userId = "123",
  shouldFail = false,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      setError(null);

      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 150));

        if (shouldFail) {
          throw new Error("Failed to fetch user");
        }

        setUser({
          id: userId,
          name: `User ${userId}`,
          email: `user${userId}@example.com`,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    void fetchUser();
  }, [userId, shouldFail]);

  if (loading) {
    return <div>Loading user data...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!user) {
    return <div>No user found</div>;
  }

  return (
    <div>
      <h2>User Profile</h2>
      <p>ID: {user.id}</p>
      <p>Name: {user.name}</p>
      <p>Email: {user.email}</p>
    </div>
  );
};
