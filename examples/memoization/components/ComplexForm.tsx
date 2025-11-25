import { memo, useState, useCallback } from "react";
import type { FormEvent } from "react";

interface FormFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export const FormField = memo<FormFieldProps>(
  ({ label, value, onChange, error }) => {
    return (
      <div style={{ marginBottom: "16px" }}>
        <label style={{ display: "block", marginBottom: "4px" }}>
          {label}:
          <input
            type="text"
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
            }}
            style={{
              marginLeft: "8px",
              padding: "4px",
              border: error ? "1px solid red" : "1px solid #ccc",
            }}
          />
        </label>
        {error && (
          <span style={{ color: "red", fontSize: "12px" }}>{error}</span>
        )}
      </div>
    );
  },
);

FormField.displayName = "FormField";

export const MemoizedForm = memo<{ onSubmit?: (data: FormData) => void }>(
  ({ onSubmit }) => {
    const [formData, setFormData] = useState<FormData>({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
    });

    const [errors, setErrors] = useState<Partial<FormData>>({});

    const handleFieldChange = useCallback(
      (field: keyof FormData) => (value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      },
      [],
    );

    const handleSubmit = useCallback(
      (e: FormEvent) => {
        e.preventDefault();
        const newErrors: Partial<FormData> = {};

        if (!formData.firstName) {
          newErrors.firstName = "Required";
        }
        if (!formData.lastName) {
          newErrors.lastName = "Required";
        }
        if (!formData.email) {
          newErrors.email = "Required";
        }
        if (formData.email && !formData.email.includes("@")) {
          newErrors.email = "Invalid email";
        }

        if (Object.keys(newErrors).length > 0) {
          setErrors(newErrors);

          return;
        }

        onSubmit?.(formData);
      },
      [formData, onSubmit],
    );

    return (
      <form onSubmit={handleSubmit}>
        <h3>Memoized Form</h3>
        <FormField
          label="First Name"
          value={formData.firstName}
          onChange={handleFieldChange("firstName")}
          error={errors.firstName}
        />
        <FormField
          label="Last Name"
          value={formData.lastName}
          onChange={handleFieldChange("lastName")}
          error={errors.lastName}
        />
        <FormField
          label="Email"
          value={formData.email}
          onChange={handleFieldChange("email")}
          error={errors.email}
        />
        <FormField
          label="Phone"
          value={formData.phone}
          onChange={handleFieldChange("phone")}
          error={errors.phone}
        />
        <button type="submit">Submit</button>
      </form>
    );
  },
);

MemoizedForm.displayName = "MemoizedForm";

export const UnmemoizedForm = ({
  onSubmit,
}: {
  onSubmit?: (data: FormData) => void;
}) => {
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  const [errors, setErrors] = useState<Partial<FormData>>({});

  const handleFieldChange = (field: keyof FormData) => (value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const newErrors: Partial<FormData> = {};

    if (!formData.firstName) {
      newErrors.firstName = "Required";
    }
    if (!formData.lastName) {
      newErrors.lastName = "Required";
    }
    if (!formData.email) {
      newErrors.email = "Required";
    }
    if (formData.email && !formData.email.includes("@")) {
      newErrors.email = "Invalid email";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);

      return;
    }

    onSubmit?.(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>Unmemoized Form</h3>
      <div style={{ marginBottom: "16px" }}>
        <label style={{ display: "block", marginBottom: "4px" }}>
          First Name:
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => {
              handleFieldChange("firstName")(e.target.value);
            }}
            style={{
              marginLeft: "8px",
              padding: "4px",
              border: errors.firstName ? "1px solid red" : "1px solid #ccc",
            }}
          />
        </label>
        {errors.firstName && (
          <span style={{ color: "red", fontSize: "12px" }}>
            {errors.firstName}
          </span>
        )}
      </div>
      <div style={{ marginBottom: "16px" }}>
        <label style={{ display: "block", marginBottom: "4px" }}>
          Last Name:
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) => {
              handleFieldChange("lastName")(e.target.value);
            }}
            style={{
              marginLeft: "8px",
              padding: "4px",
              border: errors.lastName ? "1px solid red" : "1px solid #ccc",
            }}
          />
        </label>
        {errors.lastName && (
          <span style={{ color: "red", fontSize: "12px" }}>
            {errors.lastName}
          </span>
        )}
      </div>
      <div style={{ marginBottom: "16px" }}>
        <label style={{ display: "block", marginBottom: "4px" }}>
          Email:
          <input
            type="text"
            value={formData.email}
            onChange={(e) => {
              handleFieldChange("email")(e.target.value);
            }}
            style={{
              marginLeft: "8px",
              padding: "4px",
              border: errors.email ? "1px solid red" : "1px solid #ccc",
            }}
          />
        </label>
        {errors.email && (
          <span style={{ color: "red", fontSize: "12px" }}>{errors.email}</span>
        )}
      </div>
      <div style={{ marginBottom: "16px" }}>
        <label style={{ display: "block", marginBottom: "4px" }}>
          Phone:
          <input
            type="text"
            value={formData.phone}
            onChange={(e) => {
              handleFieldChange("phone")(e.target.value);
            }}
            style={{
              marginLeft: "8px",
              padding: "4px",
              border: errors.phone ? "1px solid red" : "1px solid #ccc",
            }}
          />
        </label>
        {errors.phone && (
          <span style={{ color: "red", fontSize: "12px" }}>{errors.phone}</span>
        )}
      </div>
      <button type="submit">Submit</button>
    </form>
  );
};
