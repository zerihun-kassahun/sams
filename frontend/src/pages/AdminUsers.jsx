import { useCallback, useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import {
  createUser,
  deleteUser,
  fetchDepartments,
  fetchUsers,
  updateUser,
} from "../api/users";
import { ADMIN_NAV, ROLE_LABELS } from "../config/adminNav";

const EMPTY_FORM = {
  username: "",
  full_name: "",
  email: "",
  role: "instructor",
  password: "",
  department_id: "",
  is_active: true,
};

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filterRole, setFilterRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchUsers(filterRole || undefined);
      setUsers(data.users);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filterRole]);

  useEffect(() => {
    loadUsers();
    fetchDepartments()
      .then((data) => setDepartments(data.departments))
      .catch(() => {});
  }, [loadUsers]);

  function openCreateModal() {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
    setSuccess("");
  }

  function openEditModal(user) {
    setEditingUser(user);
    setForm({
      username: user.username,
      full_name: user.full_name,
      email: user.email || "",
      role: user.role,
      password: "",
      department_id: user.department_id ? String(user.department_id) : "",
      is_active: user.is_active,
    });
    setModalOpen(true);
    setSuccess("");
  }

  function closeModal() {
    setModalOpen(false);
    setEditingUser(null);
    setForm(EMPTY_FORM);
  }

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const payload = {
      username: form.username.trim(),
      full_name: form.full_name.trim(),
      email: form.email.trim() || null,
      role: form.role,
      is_active: form.is_active,
    };

    if (form.role === "department_head") {
      payload.department_id = form.department_id ? Number(form.department_id) : null;
    }

    if (form.password) {
      payload.password = form.password;
    }

    try {
      if (editingUser) {
        await updateUser(editingUser.id, payload);
        setSuccess("User updated successfully.");
      } else {
        if (!form.password) {
          setError("Password is required for new users.");
          setSubmitting(false);
          return;
        }
        payload.password = form.password;
        await createUser(payload);
        setSuccess("User created successfully.");
      }
      closeModal();
      loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(user) {
    if (!window.confirm(`Delete user "${user.username}"? This cannot be undone.`)) {
      return;
    }
    setError("");
    try {
      await deleteUser(user.id);
      setSuccess("User removed successfully.");
      loadUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <DashboardLayout title="User Management" roleLabel="Admin" navItems={ADMIN_NAV}>
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Instructors &amp; Department Heads</h2>
            <p className="muted">Create, update, or remove system user accounts.</p>
          </div>
          <button className="btn btn-primary btn-inline" type="button" onClick={openCreateModal}>
            Add user
          </button>
        </div>

        <div className="toolbar">
          <label htmlFor="role-filter">Filter by role</label>
          <select id="role-filter" value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
            <option value="">All roles</option>
            <option value="instructor">Instructor</option>
            <option value="department_head">Department Head</option>
          </select>
        </div>

        {loading ? (
          <p className="muted">Loading users...</p>
        ) : users.length === 0 ? (
          <p className="muted">No users found. Click &quot;Add user&quot; to create one.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Full name</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.username}</td>
                    <td>{user.full_name}</td>
                    <td>
                      <span className="badge">{ROLE_LABELS[user.role] || user.role}</span>
                    </td>
                    <td>{user.department_name || "—"}</td>
                    <td>
                      <span className={`badge ${user.is_active ? "badge-success" : "badge-muted"}`}>
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button className="btn btn-secondary btn-sm" type="button" onClick={() => openEditModal(user)}>
                        Edit
                      </button>
                      <button className="btn btn-danger btn-sm" type="button" onClick={() => handleDelete(user)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal card" onClick={(e) => e.stopPropagation()}>
            <h2>{editingUser ? "Edit user" : "Create user"}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="username">Username</label>
                  <input
                    id="username"
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    required
                    disabled={!!editingUser}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="full_name">Full name</label>
                  <input id="full_name" name="full_name" value={form.full_name} onChange={handleChange} required />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input id="email" name="email" type="email" value={form.email} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label htmlFor="role">Role</label>
                  <select id="role" name="role" value={form.role} onChange={handleChange} required>
                    <option value="instructor">Instructor</option>
                    <option value="department_head">Department Head</option>
                  </select>
                </div>
              </div>

              {form.role === "department_head" && (
                <div className="form-group">
                  <label htmlFor="department_id">Department</label>
                  <select
                    id="department_id"
                    name="department_id"
                    value={form.department_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name} ({dept.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="password">{editingUser ? "New password (optional)" : "Password"}</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  required={!editingUser}
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>

              {editingUser && (
                <div className="form-group checkbox-group">
                  <label>
                    <input name="is_active" type="checkbox" checked={form.is_active} onChange={handleChange} />
                    Account is active
                  </label>
                </div>
              )}

              <div className="modal-actions">
                <button className="btn btn-secondary" type="button" onClick={closeModal}>
                  Cancel
                </button>
                <button className="btn btn-primary btn-inline" type="submit" disabled={submitting}>
                  {submitting ? "Saving..." : editingUser ? "Save changes" : "Create user"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
