const Todo = require("../models/Todo");

// GET /api/todos
const getTodos = async (req, res) => {
  try {
    const todos = await Todo.find({ owner: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json(todos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// POST /api/todos
const createTodo = async (req, res) => {
  try {
    const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }
    const todo = await Todo.create({ title, owner: req.user._id });
    res.status(201).json(todo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/todos/:id
const updateTodo = async (req, res) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ message: "At least one field is required" });
    }
    const updates = {};
    if (Object.hasOwn(req.body, "title")) {
      if (typeof req.body.title !== "string" || !req.body.title.trim()) {
        return res.status(400).json({ message: "Title must not be empty" });
      }
      updates.title = req.body.title.trim();
    }
    if (Object.hasOwn(req.body, "completed")) {
      if (typeof req.body.completed !== "boolean") {
        return res.status(400).json({ message: "Completed must be a boolean" });
      }
      updates.completed = req.body.completed;
    }
    if (Object.keys(updates).length !== Object.keys(req.body).length) {
      return res.status(400).json({ message: "Only title and completed can be updated" });
    }

    const todo = await Todo.findOneAndUpdate({ _id: req.params.id, owner: req.user._id }, updates, {
      new: true,
      runValidators: true,
    });
    if (!todo) {
      return res.status(404).json({ message: "Todo not found" });
    }
    res.status(200).json(todo);
  } catch (err) {
    console.error(err);
    res.status(err.name === "CastError" ? 400 : 500).json({ message: err.message });
  }
};

// DELETE /api/todos/:id
const deleteTodo = async (req, res) => {
  try {
    const todo = await Todo.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!todo) {
      return res.status(404).json({ message: "Todo not found" });
    }
    res.status(200).json({ message: "Todo deleted", todo });
  } catch (err) {
    console.error(err);
    res.status(err.name === "CastError" ? 400 : 500).json({ message: err.message });
  }
};

module.exports = { getTodos, createTodo, updateTodo, deleteTodo };
