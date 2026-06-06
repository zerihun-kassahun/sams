import { useCallback, useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import WebcamCapture from "../components/WebcamCapture";
import { fetchDepartments } from "../api/users";
import {
  captureStudentFace,
  createStudent,
  deleteStudent,
  fetchSections,
  fetchStudents,
  updateStudent,
} from "../api/students";
import { ADMIN_NAV } from "../config/adminNav";

const EMPTY_FORM = {
  student_id: "",
  full_name: "",
  email: "",
  department_id: "",
  section_id: "",
  consent_given: false,
  is_active: true,
};

let captureId = 0;

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [sections, setSections] = useState([]);
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [filterSections, setFilterSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [captures, setCaptures] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const filters = {};
      if (filterDepartment) filters.department_id = filterDepartment;
      if (filterSection) filters.section_id = filterSection;
      const data = await fetchStudents(filters);
      setStudents(data.students);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filterDepartment, filterSection]);

  useEffect(() => {
    loadStudents();
    fetchDepartments()
      .then((data) => setDepartments(data.departments))
      .catch(() => {});
  }, [loadStudents]);

  useEffect(() => {
    if (!filterDepartment) {
      setFilterSections([]);
      setFilterSection("");
      return;
    }
    fetchSections(filterDepartment)
      .then((data) => setFilterSections(data.sections))
      .catch(() => setFilterSections([]));
  }, [filterDepartment]);

  useEffect(() => {
    if (!form.department_id) {
      setSections([]);
      return;
    }
    fetchSections(form.department_id)
      .then((data) => setSections(data.sections))
      .catch(() => setSections([]));
  }, [form.department_id]);

  function openCreateModal() {
    setEditingStudent(null);
    setForm(EMPTY_FORM);
    setCaptures([]);
    setModalOpen(true);
    setSuccess("");
  }

  function openEditModal(student) {
    setEditingStudent(student);
    setForm({
      student_id: student.student_id,
      full_name: student.full_name,
      email: student.email || "",
      department_id: String(student.department_id),
      section_id: String(student.section_id),
      consent_given: student.consent_given,
      is_active: student.is_active,
    });
    setCaptures([]);
    setModalOpen(true);
    setSuccess("");
  }

  function closeModal() {
    setModalOpen(false);
    setEditingStudent(null);
    setForm(EMPTY_FORM);
    setCaptures([]);
  }

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((prev) => {
      const next = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };
      if (name === "department_id") {
        next.section_id = "";
      }
      return next;
    });
  }

  function handleCapture(dataUrl) {
    captureId += 1;
    setCaptures((prev) => [...prev, { id: captureId, dataUrl }]);
  }

  function handleRemoveCapture(id) {
    setCaptures((prev) => prev.filter((item) => item.id !== id));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const payload = {
      student_id: form.student_id.trim(),
      full_name: form.full_name.trim(),
      email: form.email.trim() || null,
      department_id: Number(form.department_id),
      section_id: Number(form.section_id),
      consent_given: form.consent_given,
    };

    try {
      if (editingStudent) {
        payload.is_active = form.is_active;
        await updateStudent(editingStudent.id, payload);

        for (const capture of captures) {
          await captureStudentFace(editingStudent.id, capture.dataUrl);
        }

        setSuccess(
          captures.length
            ? "Student updated and new face images captured."
            : "Student updated successfully."
        );
      } else {
        if (!form.consent_given) {
          setError("Biometric consent is required.");
          setSubmitting(false);
          return;
        }
        if (captures.length === 0) {
          setError("Capture at least one facial image before registering.");
          setSubmitting(false);
          return;
        }

        const result = await createStudent({
          ...payload,
          face_images: captures.map((item) => item.dataUrl),
        });
        if (result.warnings?.length) {
          setSuccess(`${result.message} ${result.warnings[0]}`);
        } else {
          setSuccess(result.message);
        }
      }

      closeModal();
      loadStudents();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(student) {
    if (!window.confirm(`Delete student "${student.full_name}" (${student.student_id})?`)) {
      return;
    }
    setError("");
    try {
      await deleteStudent(student.id);
      setSuccess("Student removed successfully.");
      loadStudents();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <DashboardLayout title="Student Registration" roleLabel="Admin" navItems={ADMIN_NAV}>
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Registered students</h2>
            <p className="muted">Register students, assign sections, and capture facial images.</p>
          </div>
          <button className="btn btn-primary btn-inline" type="button" onClick={openCreateModal}>
            Register student
          </button>
        </div>

        <div className="toolbar toolbar-wrap">
          <div>
            <label htmlFor="filter-dept">Department</label>
            <select
              id="filter-dept"
              value={filterDepartment}
              onChange={(e) => {
                setFilterDepartment(e.target.value);
                setFilterSection("");
              }}
            >
              <option value="">All departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filter-section">Section</label>
            <select
              id="filter-section"
              value={filterSection}
              onChange={(e) => setFilterSection(e.target.value)}
              disabled={!filterDepartment}
            >
              <option value="">All sections</option>
              {filterSections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <p className="muted">Loading students...</p>
        ) : students.length === 0 ? (
          <p className="muted">No students registered yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Full name</th>
                  <th>Department</th>
                  <th>Section</th>
                  <th>Faces</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id}>
                    <td>{student.student_id}</td>
                    <td>{student.full_name}</td>
                    <td>{student.department_name || "—"}</td>
                    <td>{student.section_name || "—"}</td>
                    <td>{student.face_count}</td>
                    <td>
                      <span className={`badge ${student.is_active ? "badge-success" : "badge-muted"}`}>
                        {student.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button
                        className="btn btn-secondary btn-sm"
                        type="button"
                        onClick={() => openEditModal(student)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        type="button"
                        onClick={() => handleDelete(student)}
                      >
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
          <div className="modal card modal-wide" onClick={(e) => e.stopPropagation()}>
            <h2>{editingStudent ? "Edit student" : "Register student"}</h2>

            <form onSubmit={handleSubmit}>
              <div className="modal-grid">
                <div>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="student_id">Student ID</label>
                      <input
                        id="student_id"
                        name="student_id"
                        value={form.student_id}
                        onChange={handleChange}
                        required
                        disabled={!!editingStudent}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="full_name">Full name</label>
                      <input
                        id="full_name"
                        name="full_name"
                        value={form.full_name}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input id="email" name="email" type="email" value={form.email} onChange={handleChange} />
                  </div>

                  <div className="form-row">
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
                    <div className="form-group">
                      <label htmlFor="section_id">Section</label>
                      <select
                        id="section_id"
                        name="section_id"
                        value={form.section_id}
                        onChange={handleChange}
                        required
                        disabled={!form.department_id}
                      >
                        <option value="">Select section</option>
                        {sections.map((section) => (
                          <option key={section.id} value={section.id}>
                            {section.name}
                            {section.year ? ` · Year ${section.year}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-group checkbox-group">
                    <label>
                      <input
                        name="consent_given"
                        type="checkbox"
                        checked={form.consent_given}
                        onChange={handleChange}
                        required={!editingStudent}
                      />
                      Student has authorized collection of facial data for attendance only
                    </label>
                  </div>

                  {editingStudent && (
                    <div className="form-group checkbox-group">
                      <label>
                        <input
                          name="is_active"
                          type="checkbox"
                          checked={form.is_active}
                          onChange={handleChange}
                        />
                        Student is active
                      </label>
                    </div>
                  )}
                </div>

                <WebcamCapture
                  captures={captures}
                  onCapture={handleCapture}
                  onRemove={handleRemoveCapture}
                  disabled={!form.consent_given || submitting}
                />
              </div>

              <div className="modal-actions">
                <button className="btn btn-secondary" type="button" onClick={closeModal}>
                  Cancel
                </button>
                <button className="btn btn-primary btn-inline" type="submit" disabled={submitting}>
                  {submitting
                    ? "Saving..."
                    : editingStudent
                      ? "Save changes"
                      : "Register student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
