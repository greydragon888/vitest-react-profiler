import { useState, useEffect } from "react";

import type { FC, ChangeEvent } from "react";

/**
 * FormValidator - demonstrates form validation with re-renders
 *
 * Use case: Testing form components with validation logic
 *
 * Triggers re-renders on:
 * - Input value change
 * - Validation state change (debounced)
 *
 * @example
 * ```tsx
 * const ProfiledForm = withProfiler(FormValidator);
 * ProfiledForm.onRender((info) => {
 *   if (info.phase === 'update') {
 *     console.log('Revalidation triggered');
 *   }
 * });
 * ```
 */
export const FormValidator: FC = () => {
  const [email, setEmail] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!email) {
      setIsValid(null);
      setError(null);

      return;
    }

    setIsValidating(true);

    // Debounced validation (simulate async validation like checking email uniqueness)
    const timer = setTimeout(() => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const valid = emailRegex.test(email);

      setIsValid(valid);
      setError(valid ? null : "Invalid email format");
      setIsValidating(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [email]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  return (
    <div>
      <h2>Email Validator</h2>
      <input
        type="email"
        value={email}
        onChange={handleChange}
        placeholder="Enter your email"
      />
      {isValidating && <p>Validating...</p>}
      {isValid === true && <p style={{ color: "green" }}>Valid email!</p>}
      {isValid === false && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
};
