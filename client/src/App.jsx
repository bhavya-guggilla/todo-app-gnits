import { useEffect, useState } from "react";
import {
  getCurrentUser,
  getTodos,
  createTodo,
  updateTodo,
  deleteTodo,
  logout,
} from "./api";
import { FILTERS } from "./filters";
import Sidebar from "./components/Sidebar";
import TodoForm from "./components/TodoForm";
import TodoItem from "./components/TodoItem";
import AuthPage from "./components/AuthPage";

const getInitialTheme = () => {
  try {
    const savedTheme = localStorage.getItem("todo-theme");
    if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
  } catch {
    // Fall back to the system preference when browser storage is unavailable.
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

function App() {
  const PAGE_SIZE = 10;
  const [todos, setTodos] = useState([]);
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState(getInitialTheme);
  const [authLoading, setAuthLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("todo-theme", theme);
    } catch {
      // The theme still applies for this session if browser storage is unavailable.
    }
  }, [theme]);

  const toggleTheme = () => setTheme((current) => current === "dark" ? "light" : "dark");

  // Runs an API action and shows its error in the banner if it fails
  const run = async (action) => {
    try {
      setError("");
      await action();
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then((currentUser) => {
        if (active) setUser(currentUser);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setTodos([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    getTodos()
      .then((items) => {
        if (active) setTodos(items);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  const handleAdd = (title) =>
    run(async () => {
      const newTodo = await createTodo(title);
      setTodos((prev) => [newTodo, ...prev]);
      setCurrentPage(1);
    });

  const handleUpdate = (id, data) =>
    run(async () => {
      const updated = await updateTodo(id, data);
      setTodos((prev) => prev.map((todo) => (todo._id === id ? updated : todo)));
    });

  const handleDelete = (id) =>
    run(async () => {
      await deleteTodo(id);
      setTodos((prev) => prev.filter((t) => t._id !== id));
    });

  const handleClearDone = () =>
    run(async () => {
      const done = todos.filter(FILTERS.done.test);
      await Promise.all(done.map((t) => deleteTodo(t._id)));
      setTodos((prev) => prev.filter((t) => !t.completed));
    });

  const handleLogout = () =>
    run(async () => {
      await logout();
      setUser(null);
      setTodos([]);
      setError("");
    });

  const filteredTodos = todos
    .filter(FILTERS[filter].test)
    .filter((todo) => todo.title.toLowerCase().includes(searchQuery.trim().toLowerCase()));
  const pageCount = Math.ceil(filteredTodos.length / PAGE_SIZE);
  const visiblePage = Math.min(currentPage, Math.max(pageCount, 1));
  const pageTodos = filteredTodos.slice(
    (visiblePage - 1) * PAGE_SIZE,
    visiblePage * PAGE_SIZE
  );
  const firstVisibleTask = filteredTodos.length
    ? (visiblePage - 1) * PAGE_SIZE + 1
    : 0;
  const lastVisibleTask = Math.min(visiblePage * PAGE_SIZE, filteredTodos.length);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, Math.max(pageCount, 1)));
  }, [pageCount]);

  if (authLoading) {
    return <main className="auth-shell"><p className="auth-loading">Loading account...</p></main>;
  }

  if (!user) {
    return <AuthPage
      onAuthenticated={(currentUser) => { setError(""); setUser(currentUser); }}
      error={error}
      theme={theme}
      onToggleTheme={toggleTheme}
    />;
  }

  return (
    <div className="layout">
      <Sidebar
        todos={todos}
        user={user}
        theme={theme}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
        filter={filter}
        onFilter={(nextFilter) => {
          setFilter(nextFilter);
          setCurrentPage(1);
        }}
        onClearDone={handleClearDone}
      />

      <main className="panel content">
        <header className="content-header">
          <h2>{FILTERS[filter].label}</h2>
          <span className="content-count">
            {filteredTodos.length} {filteredTodos.length === 1 ? "task" : "tasks"}
          </span>
        </header>

        <TodoForm onAdd={handleAdd} />

        <label className="todo-search">
          <span className="search-icon" aria-hidden="true">⌕</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search tasks..."
            aria-label="Search tasks"
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery("")} aria-label="Clear search">
              ×
            </button>
          )}
        </label>

        {error && (
          <div className="error" role="alert">
            <span>{error}</span>
            <button onClick={() => setError("")} aria-label="Dismiss">
              ×
            </button>
          </div>
        )}

        {loading ? (
          <p className="empty">Loading...</p>
        ) : filteredTodos.length === 0 ? (
          <div className="empty">
            <img src="/logo.png" alt="" />
            <p>
              {searchQuery.trim()
                ? "No tasks match your search."
                : filter === "done"
                ? "Nothing completed yet"
                : "You're all caught up. Add a task above."}
            </p>
          </div>
        ) : (
          <ul className="todo-list">
            {pageTodos.map((todo) => (
              <TodoItem
                key={todo._id}
                todo={todo}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ))}
          </ul>
        )}

        {!loading && filteredTodos.length > 0 && pageCount > 1 && (
          <nav className="pagination" aria-label="Task pages">
            <span className="pagination-summary">
              Showing {firstVisibleTask}–{lastVisibleTask} of {filteredTodos.length}
            </span>
            <div className="pagination-controls">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                disabled={visiblePage === 1}
              >
                Previous
              </button>
              <span aria-live="polite">Page {visiblePage} of {pageCount}</span>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(page + 1, pageCount))}
                disabled={visiblePage === pageCount}
              >
                Next
              </button>
            </div>
          </nav>
        )}
      </main>
    </div>
  );
}

export default App;
