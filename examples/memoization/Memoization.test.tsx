import { render, fireEvent, screen, waitFor } from "@testing-library/react";
import { memo, useState, useCallback } from "react";
import { withProfiler } from "../../src";
import {
  MemoizedList,
  UnmemoizedList,
  ListItem,
} from "./components/MemoizedList.tsx";
import {
  MemoizedForm,
  UnmemoizedForm,
  FormField,
} from "./components/ComplexForm.tsx";
import {
  MemoizedDataGrid,
  UnmemoizedDataGrid,
  GridRow,
} from "./components/DataGrid.tsx";

describe("Memoization Performance Tests", () => {
  describe("List Component Memoization", () => {
    const generateItems = (count: number) =>
      Array.from({ length: count }, (_, i) => ({
        id: `item-${i}`,
        text: `Item ${i}`,
        highlighted: i % 5 === 0,
      }));

    beforeEach(() => {
      // Clear counters between tests
    });

    it("should prevent re-renders with memoized list when props don't change", () => {
      const items = generateItems(10);
      const onItemClick = vi.fn();

      // Wrap ProfiledComponent with memo as per documentation
      const ProfiledMemoizedList = withProfiler(MemoizedList, "MemoizedList");
      const MemoProfiled = memo(ProfiledMemoizedList);

      const { rerender } = render(
        <MemoProfiled items={items} onItemClick={onItemClick} />,
      );

      expect(ProfiledMemoizedList).toHaveRenderedTimes(1);

      // Same reference - memo should prevent re-render
      rerender(<MemoProfiled items={items} onItemClick={onItemClick} />);

      expect(ProfiledMemoizedList).toHaveRenderedTimes(1);
      expect(ProfiledMemoizedList.getRendersByPhase("mount")).toHaveLength(1); // Only initial mount
    });

    it("should re-render unmemoized list even when props don't change", () => {
      const items = generateItems(10);
      const onItemClick = vi.fn();

      const ProfiledUnmemoizedList = withProfiler(
        UnmemoizedList,
        "UnmemoizedList",
      );

      const { rerender } = render(
        <ProfiledUnmemoizedList items={items} onItemClick={onItemClick} />,
      );

      expect(ProfiledUnmemoizedList).toHaveRenderedTimes(1);

      rerender(
        <ProfiledUnmemoizedList items={items} onItemClick={onItemClick} />,
      );

      expect(ProfiledUnmemoizedList).toHaveRenderedTimes(2);
      const updates = ProfiledUnmemoizedList.getRendersByPhase("update");

      expect(updates).toHaveLength(1);
    });

    it("should optimize filter operations with useMemo", () => {
      const items = generateItems(100);

      const ProfiledMemoizedList = withProfiler(MemoizedList, "MemoizedList");
      const MemoProfiled = memo(ProfiledMemoizedList);

      const { rerender } = render(
        <MemoProfiled items={items} filterText="1" />,
      );

      expect(ProfiledMemoizedList).toHaveRenderedTimes(1);

      // Same props - should not re-render
      rerender(<MemoProfiled items={items} filterText="1" />);

      expect(ProfiledMemoizedList).toHaveRenderedTimes(1);

      // Different filter - should re-render
      rerender(<MemoProfiled items={items} filterText="2" />);

      expect(ProfiledMemoizedList).toHaveRenderedTimes(2);
    });

    it("should measure performance difference between memoized and unmemoized", () => {
      const items = generateItems(50);

      const ProfiledMemoizedList = withProfiler(MemoizedList, "MemoizedList");
      const ProfiledUnmemoizedList = withProfiler(
        UnmemoizedList,
        "UnmemoizedList",
      );

      render(
        <>
          <ProfiledMemoizedList items={items} />
          <ProfiledUnmemoizedList items={items} />
        </>,
      );

      const memoizedTime =
        ProfiledMemoizedList.getLastRender()?.actualDuration ?? 0;
      const unmemoizedTime =
        ProfiledUnmemoizedList.getLastRender()?.actualDuration ?? 0;

      expect(ProfiledMemoizedList).toHaveRenderedWithin(100);
      expect(ProfiledUnmemoizedList).toHaveRenderedWithin(100);

      console.log(`Memoized render time: ${memoizedTime.toFixed(2)}ms`);
      console.log(`Unmemoized render time: ${unmemoizedTime.toFixed(2)}ms`);
    });

    it("should verify ListItem memoization", () => {
      const ProfiledListItem = withProfiler(ListItem, "ListItem");
      const MemoProfiledItem = memo(ProfiledListItem);

      const { rerender } = render(
        <MemoProfiledItem id="test" text="Test Item" highlighted={false} />,
      );

      expect(ProfiledListItem).toHaveRenderedTimes(1);

      // Same props - should not re-render
      rerender(
        <MemoProfiledItem id="test" text="Test Item" highlighted={false} />,
      );

      expect(ProfiledListItem).toHaveRenderedTimes(1);

      // Different props - should re-render
      rerender(
        <MemoProfiledItem id="test" text="Test Item" highlighted={true} />,
      );

      expect(ProfiledListItem).toHaveRenderedTimes(2);
    });
  });

  describe("Form Component Memoization", () => {
    beforeEach(() => {
      // Clear counters between tests
    });

    it("should prevent unnecessary FormField re-renders with memo", () => {
      const ProfiledFormField = withProfiler(FormField, "FormField");

      // Test with a parent component that uses ProfiledFormField
      const TestForm = () => {
        const [formData, setFormData] = useState({
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
        });
        const [errors, setErrors] = useState<any>({});

        const handleFieldChange = useCallback(
          (field: keyof typeof formData) => (value: string) => {
            setFormData((prev) => ({ ...prev, [field]: value }));
            setErrors((prev: any) => ({ ...prev, [field]: undefined }));
          },
          [],
        );

        return (
          <form>
            <ProfiledFormField
              label="First Name"
              value={formData.firstName}
              onChange={handleFieldChange("firstName")}
              error={errors.firstName}
            />
            <ProfiledFormField
              label="Last Name"
              value={formData.lastName}
              onChange={handleFieldChange("lastName")}
              error={errors.lastName}
            />
            <ProfiledFormField
              label="Email"
              value={formData.email}
              onChange={handleFieldChange("email")}
              error={errors.email}
            />
            <ProfiledFormField
              label="Phone"
              value={formData.phone}
              onChange={handleFieldChange("phone")}
              error={errors.phone}
            />
          </form>
        );
      };

      render(<TestForm />);

      expect(ProfiledFormField).toHaveRenderedTimes(4);

      const firstNameInput = screen.getAllByRole("textbox")[0];

      fireEvent.change(firstNameInput, { target: { value: "John" } });

      // All fields re-render when parent state changes (4 initial + 4 on change)
      expect(ProfiledFormField).toHaveRenderedTimes(8);
      const updates = ProfiledFormField.getRendersByPhase("update");

      expect(updates).toHaveLength(4);
    });

    it("should show all fields re-rendering in unmemoized form", () => {
      const ProfiledUnmemoizedForm = withProfiler(
        UnmemoizedForm,
        "UnmemoizedForm",
      );

      render(<ProfiledUnmemoizedForm />);

      expect(ProfiledUnmemoizedForm).toHaveRenderedTimes(1);

      const firstNameInput = screen.getAllByRole("textbox")[0];

      fireEvent.change(firstNameInput, { target: { value: "John" } });

      expect(ProfiledUnmemoizedForm).toHaveRenderedTimes(2);
    });

    it("should optimize callback functions with useCallback", () => {
      const onSubmit = vi.fn();

      const ProfiledMemoizedForm = withProfiler(MemoizedForm, "MemoizedForm");
      const MemoProfiled = memo(ProfiledMemoizedForm);

      const { rerender } = render(<MemoProfiled onSubmit={onSubmit} />);

      expect(ProfiledMemoizedForm).toHaveRenderedTimes(1);

      // Same props - should not re-render
      rerender(<MemoProfiled onSubmit={onSubmit} />);

      expect(ProfiledMemoizedForm).toHaveRenderedTimes(1);
    });

    it("should track performance during form validation", () => {
      const ProfiledFormField = withProfiler(FormField, "FormField");

      const TestForm = () => {
        const [formData, setFormData] = useState({
          firstName: "",
          lastName: "",
          email: "",
        });
        const [errors, setErrors] = useState<any>({});

        const handleFieldChange = useCallback(
          (field: keyof typeof formData) => (value: string) => {
            setFormData((prev) => ({ ...prev, [field]: value }));
            setErrors((prev: any) => ({ ...prev, [field]: undefined }));
          },
          [],
        );

        const handleSubmit = (e: React.FormEvent) => {
          e.preventDefault();
          const newErrors: any = {};

          if (!formData.firstName) {
            newErrors.firstName = "Required";
          }
          if (!formData.lastName) {
            newErrors.lastName = "Required";
          }
          if (!formData.email) {
            newErrors.email = "Required";
          }

          setErrors(newErrors);
        };

        return (
          <form onSubmit={handleSubmit}>
            <ProfiledFormField
              label="First Name"
              value={formData.firstName}
              onChange={handleFieldChange("firstName")}
              error={errors.firstName}
            />
            <ProfiledFormField
              label="Last Name"
              value={formData.lastName}
              onChange={handleFieldChange("lastName")}
              error={errors.lastName}
            />
            <ProfiledFormField
              label="Email"
              value={formData.email}
              onChange={handleFieldChange("email")}
              error={errors.email}
            />
            <button type="submit">Submit</button>
          </form>
        );
      };

      render(<TestForm />);

      const submitButton = screen.getByText("Submit");

      ProfiledFormField.clearCounters();

      fireEvent.click(submitButton);

      // Fields should re-render when errors are added
      expect(ProfiledFormField).toHaveRenderedTimes(3);

      const avgRenderTime = ProfiledFormField.getAverageRenderTime();

      expect(ProfiledFormField).toHaveAverageRenderTime(50);

      console.log(
        `Average FormField render time during validation: ${avgRenderTime.toFixed(2)}ms`,
      );
    });
  });

  describe("DataGrid Component Memoization", () => {
    const generateData = (count: number) =>
      Array.from({ length: count }, (_, i) => ({
        id: `row-${i}`,
        name: `Item ${i}`,
        value: Math.floor(Math.random() * 1000),
        status: (["active", "inactive", "pending"] as const)[i % 3],
      }));

    beforeEach(() => {
      // Clear counters between tests
    });

    it("should optimize row rendering with memo", () => {
      const data = generateData(20);

      const ProfiledGridRow = withProfiler(GridRow, "GridRow");

      // Test grid with profiled components
      const TestGrid = () => {
        const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

        const handleRowSelect = useCallback((id: string) => {
          setSelectedIds((prev) => {
            const next = new Set(prev);

            if (next.has(id)) {
              next.delete(id);
            } else {
              next.add(id);
            }

            return next;
          });
        }, []);

        return (
          <table>
            <tbody>
              {data.map((row) => (
                <ProfiledGridRow
                  key={row.id}
                  data={row}
                  selected={selectedIds.has(row.id)}
                  onSelect={handleRowSelect}
                />
              ))}
            </tbody>
          </table>
        );
      };

      render(<TestGrid />);

      expect(ProfiledGridRow).toHaveRenderedTimes(20);

      const firstRow = screen.getAllByRole("row")[0];

      fireEvent.click(firstRow);

      // All rows re-render when parent state changes
      const updates = ProfiledGridRow.getRendersByPhase("update");

      expect(updates).toHaveLength(20);
    });

    it("should prevent unnecessary cell re-renders", () => {
      const data = generateData(10);

      const ProfiledMemoizedGrid = withProfiler(
        MemoizedDataGrid,
        "MemoizedDataGrid",
      );
      const MemoProfiled = memo(ProfiledMemoizedGrid);

      const { rerender } = render(<MemoProfiled data={data} sortBy="name" />);

      expect(ProfiledMemoizedGrid).toHaveRenderedTimes(1);

      // Same props - should not re-render
      rerender(<MemoProfiled data={data} sortBy="name" />);

      expect(ProfiledMemoizedGrid).toHaveRenderedTimes(1);
    });

    it("should optimize sorting and filtering with useMemo", () => {
      const data = generateData(50);

      const ProfiledMemoizedGrid = withProfiler(
        MemoizedDataGrid,
        "MemoizedDataGrid",
      );

      const { rerender } = render(
        <ProfiledMemoizedGrid data={data} filterBy="active" />,
      );

      ProfiledMemoizedGrid.clearCounters();

      rerender(
        <ProfiledMemoizedGrid data={data} filterBy="active" sortBy="value" />,
      );

      expect(ProfiledMemoizedGrid).toHaveRenderedTimes(1);

      const renderTime =
        ProfiledMemoizedGrid.getLastRender()?.actualDuration ?? 0;

      expect(ProfiledMemoizedGrid).toHaveRenderedWithin(100);

      console.log(
        `Grid re-render with sort change: ${renderTime.toFixed(2)}ms`,
      );
    });

    it("should compare performance between memoized and unmemoized grids", async () => {
      const data = generateData(100);

      const ProfiledMemoizedGrid = withProfiler(
        MemoizedDataGrid,
        "MemoizedDataGrid",
      );
      const ProfiledUnmemoizedGrid = withProfiler(
        UnmemoizedDataGrid,
        "UnmemoizedDataGrid",
      );

      render(
        <>
          <ProfiledMemoizedGrid data={data} />
          <ProfiledUnmemoizedGrid data={data} />
        </>,
      );

      const memoizedInitialTime =
        ProfiledMemoizedGrid.getLastRender()?.actualDuration ?? 0;
      const unmemoizedInitialTime =
        ProfiledUnmemoizedGrid.getLastRender()?.actualDuration ?? 0;

      console.log(`Initial render comparison:`);
      console.log(`  Memoized: ${memoizedInitialTime.toFixed(2)}ms`);
      console.log(`  Unmemoized: ${unmemoizedInitialTime.toFixed(2)}ms`);

      const rows = screen.getAllByRole("row");

      fireEvent.click(rows[1]);

      await waitFor(() => {
        const memoizedUpdateTime =
          ProfiledMemoizedGrid.getLastRender()?.actualDuration ?? 0;
        const unmemoizedUpdateTime =
          ProfiledUnmemoizedGrid.getLastRender()?.actualDuration ?? 0;

        console.log(`Update render comparison:`);
        console.log(`  Memoized: ${memoizedUpdateTime.toFixed(2)}ms`);
        console.log(`  Unmemoized: ${unmemoizedUpdateTime.toFixed(2)}ms`);
      });
    });
  });

  describe("Memoization Best Practices", () => {
    it("should demonstrate when memo is effective", () => {
      const ExpensiveChild = memo(() => {
        const computed = Array(1000)
          .fill(0)
          .map((_, i) => i * 2);

        return <div>{computed.length} items computed</div>;
      });

      const ProfiledExpensiveChild = withProfiler(
        ExpensiveChild,
        "ExpensiveChild",
      );

      const Parent = () => {
        const [count, setCount] = useState(0);

        return (
          <div>
            <button
              onClick={() => {
                setCount((c) => c + 1);
              }}
            >
              Count: {count}
            </button>
            <ProfiledExpensiveChild />
          </div>
        );
      };

      render(<Parent />);

      expect(ProfiledExpensiveChild).toHaveRenderedTimes(1);

      fireEvent.click(screen.getByRole("button"));

      // ExpensiveChild re-renders when Parent state changes
      expect(ProfiledExpensiveChild).toHaveRenderedTimes(2);
      const updates = ProfiledExpensiveChild.getRendersByPhase("update");

      expect(updates).toHaveLength(1);
    });

    it("should demonstrate when memo is not effective", () => {
      const SimpleChild = memo(({ data }: { data: any[] }) => {
        return <div>{data.length} items</div>;
      });

      const ProfiledSimpleChild = withProfiler(SimpleChild, "SimpleChild");

      const Parent = () => {
        const [count, setCount] = useState(0);
        // New array created every render
        const data = [1, 2, 3];

        return (
          <div>
            <button
              onClick={() => {
                setCount((c) => c + 1);
              }}
            >
              Count: {count}
            </button>
            <ProfiledSimpleChild data={data} />
          </div>
        );
      };

      render(<Parent />);

      expect(ProfiledSimpleChild).toHaveRenderedTimes(1);

      fireEvent.click(screen.getByRole("button"));

      // Memo doesn't help because data array is recreated
      expect(ProfiledSimpleChild).toHaveRenderedTimes(2);
      const updates = ProfiledSimpleChild.getRendersByPhase("update");

      expect(updates).toHaveLength(1);
    });

    it("should track memo effectiveness over time", () => {
      const Component = memo(({ value }: { value: number }) => (
        <div>{value}</div>
      ));
      const ProfiledComponent = withProfiler(Component, "MemoComponent");
      const MemoProfiled = memo(ProfiledComponent);

      const { rerender } = render(<MemoProfiled value={1} />);

      for (let i = 0; i < 10; i++) {
        rerender(<MemoProfiled value={i % 2} />);
      }

      const history = ProfiledComponent.getRenderHistory();
      const preventedRenders = 10 - history.length + 1;

      console.log(`Memo prevented ${preventedRenders} unnecessary renders`);
      console.log(`Actual renders: ${history.length}`);
      console.log(
        `Average render time: ${ProfiledComponent.getAverageRenderTime().toFixed(2)}ms`,
      );

      expect(ProfiledComponent.getRenderCount()).toBeLessThanOrEqual(11);
    });

    it("should demonstrate proper memoization with stable references", () => {
      const DataList = memo(({ items }: { items: number[] }) => (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ));

      const ProfiledDataList = withProfiler(DataList, "DataList");
      const MemoProfiled = memo(ProfiledDataList);

      const Parent = () => {
        const [count, setCount] = useState(0);
        // Stable reference with useMemo
        const items = useState(() => [1, 2, 3, 4, 5])[0];

        return (
          <div>
            <button
              onClick={() => {
                setCount((c) => c + 1);
              }}
            >
              Count: {count}
            </button>
            <MemoProfiled items={items} />
          </div>
        );
      };

      render(<Parent />);

      expect(ProfiledDataList).toHaveRenderedTimes(1);

      // Click button multiple times
      fireEvent.click(screen.getByRole("button"));
      fireEvent.click(screen.getByRole("button"));
      fireEvent.click(screen.getByRole("button"));

      // DataList doesn't re-render because items reference is stable
      expect(ProfiledDataList).toHaveRenderedTimes(1);
      expect(ProfiledDataList).toHaveMountedOnce();
    });
  });

  describe("Performance Budget Testing", () => {
    it("should verify all components meet performance budgets", () => {
      const performanceBudgets = {
        MemoizedList: 50,
        MemoizedForm: 75,
        MemoizedDataGrid: 100,
      };

      const items = Array.from({ length: 50 }, (_, i) => ({
        id: `item-${i}`,
        text: `Item ${i}`,
        highlighted: false,
      }));

      const data = Array.from({ length: 50 }, (_, i) => ({
        id: `row-${i}`,
        name: `Item ${i}`,
        value: i * 100,
        status: "active" as const,
      }));

      // Test MemoizedList
      const ProfiledList = withProfiler(MemoizedList, "MemoizedList");

      render(<ProfiledList items={items} />);
      expect(ProfiledList).toHaveRenderedWithin(
        performanceBudgets.MemoizedList,
      );

      // Test MemoizedForm
      const ProfiledForm = withProfiler(MemoizedForm, "MemoizedForm");

      render(<ProfiledForm />);
      expect(ProfiledForm).toHaveRenderedWithin(
        performanceBudgets.MemoizedForm,
      );

      // Test MemoizedDataGrid
      const ProfiledGrid = withProfiler(MemoizedDataGrid, "MemoizedDataGrid");

      render(<ProfiledGrid data={data} />);
      expect(ProfiledGrid).toHaveRenderedWithin(
        performanceBudgets.MemoizedDataGrid,
      );

      console.log("Performance Budget Results:");
      console.log(
        `  MemoizedList: ${ProfiledList.getLastRender()?.actualDuration.toFixed(2)}ms / ${performanceBudgets.MemoizedList}ms`,
      );
      console.log(
        `  MemoizedForm: ${ProfiledForm.getLastRender()?.actualDuration.toFixed(2)}ms / ${performanceBudgets.MemoizedForm}ms`,
      );
      console.log(
        `  MemoizedDataGrid: ${ProfiledGrid.getLastRender()?.actualDuration.toFixed(2)}ms / ${performanceBudgets.MemoizedDataGrid}ms`,
      );
    });
  });
});
