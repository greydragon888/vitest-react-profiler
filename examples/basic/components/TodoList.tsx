import { useState } from "react";

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

export const TodoList: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputText, setInputText] = useState("");

  const addTodo = () => {
    if (inputText.trim()) {
      setTodos([
        ...todos,
        { id: Date.now(), text: inputText.trim(), completed: false },
      ]);
      setInputText("");
    }
  };

  const toggleTodo = (id: number) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo,
      ),
    );
  };

  const removeTodo = (id: number) => {
    setTodos(todos.filter((todo) => todo.id !== id));
  };

  return (
    <div>
      <h2>Todo List</h2>
      <div>
        <input
          type="text"
          value={inputText}
          onChange={(e) => {
            setInputText(e.target.value);
          }}
          onKeyPress={(e) => e.key === "Enter" && addTodo()}
          placeholder="Add a todo..."
        />
        <button onClick={addTodo}>Add</button>
      </div>
      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>
            <span
              style={{
                textDecoration: todo.completed ? "line-through" : "none",
                cursor: "pointer",
              }}
              onClick={() => {
                toggleTodo(todo.id);
              }}
            >
              {todo.text}
            </span>
            <button
              onClick={() => {
                removeTodo(todo.id);
              }}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <p>Total todos: {todos.length}</p>
      <p>Completed: {todos.filter((t) => t.completed).length}</p>
    </div>
  );
};
