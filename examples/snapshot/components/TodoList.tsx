import { useState } from "react";

interface TodoListProps {
  initialTodos?: string[];
}

/**
 * Todo list component with add/remove functionality
 * Demonstrates action-based testing with snapshots
 */
export function TodoList({ initialTodos = [] }: TodoListProps) {
  const [todos, setTodos] = useState<string[]>(initialTodos);
  const [inputValue, setInputValue] = useState("");

  const addTodo = () => {
    if (inputValue.trim()) {
      setTodos([...todos, inputValue.trim()]);
      setInputValue("");
    }
  };

  const removeTodo = (index: number) => {
    setTodos(todos.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div>
        <input
          data-testid="todo-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Add todo"
        />
        <button onClick={addTodo}>Add</button>
      </div>
      <ul data-testid="todo-list">
        {todos.map((todo, index) => (
          <li key={index}>
            {todo}
            <button onClick={() => removeTodo(index)}>Remove</button>
          </li>
        ))}
      </ul>
      <span data-testid="todo-count">Total: {todos.length}</span>
    </div>
  );
}
