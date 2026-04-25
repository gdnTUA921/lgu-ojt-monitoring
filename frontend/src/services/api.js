/**
 * LGU OJT Monitoring System — API Service
 * Centralized endpoint manager for all fetch calls.
 * JSON keys match database column names from lgu-monitoring-schema.sql.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
export const ASSET_URL = API_BASE_URL.replace('/api', '');

/* ── Helper: Build URL with query params ─── */
function buildUrl(path, params = {}) {
  const url = new URL(`${API_BASE_URL}${path}`);
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      url.searchParams.append(key, val);
    }
  });
  return url.toString();
}

/* ── Helper: Standard fetch wrapper ──────── */
async function request(url, options = {}) {
  const token = localStorage.getItem('auth_token') ?? sessionStorage.getItem('auth_token');

  // Detect if body is FormData (file upload) — skip JSON Content-Type
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const err = new Error(errBody.message || `Request failed: ${res.status}`);
    err.status = res.status;
    err.body = errBody;
    throw err;
  }

  if (res.status === 204) return null;
  return res.json();
}

/* ══════════════════════════════════════════════
   AUTH
   ══════════════════════════════════════════════ */
export const authApi = {
  login: (body) =>
    request(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify(body), // { email, password }
    }),

  verify2FA: (body) =>
    request(`${API_BASE_URL}/auth/verify-2fa`, {
      method: 'POST',
      body: JSON.stringify(body), // { user_id, otp_code }
    }),

  resend2FA: (body) =>
    request(`${API_BASE_URL}/auth/resend-2fa`, {
      method: 'POST',
      body: JSON.stringify(body), // { user_id }
    }),

  logout: (body) =>
    request(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      body: JSON.stringify(body), // { user_id }
    }),

  forgotPassword: (body) =>
    request(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      body: JSON.stringify(body), // { email }
    }),

  resetPassword: (body) =>
    request(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      body: JSON.stringify(body), // { user_id, otp_code, new_password }
    }),
};

/* ══════════════════════════════════════════════
   USERS
   ══════════════════════════════════════════════ */
export const usersApi = {
  list: (params) =>
    request(buildUrl('/admin/users', params)),

  get: (userId) =>
    request(`${API_BASE_URL}/admin/users/${userId}`),

  create: (body) =>
    request(`${API_BASE_URL}/admin/users`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  update: (userId, body) =>
    request(`${API_BASE_URL}/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  toggleStatus: (userId) =>
    request(`${API_BASE_URL}/admin/users/${userId}/toggle-status`, { method: 'PATCH' }),

  toggle2FA: (userId, body) =>
    request(`${API_BASE_URL}/admin/users/${userId}/2fa`, {
      method: 'PATCH',
      body: JSON.stringify(body), // { is_2fa_enabled }
    }),
};

/* ══════════════════════════════════════════════
   DEPARTMENTS
   ══════════════════════════════════════════════ */
export const departmentsApi = {
  list: (params) =>
    request(buildUrl('/departments', params)),

  get: (departmentId) =>
    request(`${API_BASE_URL}/departments/${departmentId}`),

  create: (body) =>
    request(`${API_BASE_URL}/departments`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  update: (departmentId, body) =>
    request(`${API_BASE_URL}/departments/${departmentId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  delete: (departmentId) =>
    request(`${API_BASE_URL}/departments/${departmentId}`, { method: 'DELETE' }),
};

/* ══════════════════════════════════════════════
   INTERNS
   ══════════════════════════════════════════════ */
export const internsApi = {
  list: (params) =>
    request(buildUrl('/interns', params)),

  adminList: (params) =>
    request(buildUrl('/admin/interns', params)),

  supervisorList: (params) =>
    request(buildUrl('/supervisor/interns', params)),

  get: (internId) =>
    request(`${API_BASE_URL}/interns/${internId}`),

  update: (internId, body) =>
    request(`${API_BASE_URL}/interns/${internId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  markComplete: (internId) =>
    request(`${API_BASE_URL}/interns/${internId}/complete`, { method: 'PATCH' }),

  markTerminated: (internId) =>
    request(`${API_BASE_URL}/interns/${internId}/terminate`, { method: 'PATCH' }),

  updateStatus: (internId, status) =>
    request(`${API_BASE_URL}/admin/interns/${internId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};

/* ══════════════════════════════════════════════
   TIME LOGS
   ══════════════════════════════════════════════ */
export const timelogsApi = {
  list: (params) =>
    request(buildUrl('/timelogs', params)),

  get: (timelogId) =>
    request(`${API_BASE_URL}/timelogs/${timelogId}`),

  clockIn: (body) =>
    request(`${API_BASE_URL}/intern/clock-in`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  clockOut: (body) =>
    request(`${API_BASE_URL}/intern/clock-out`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  clockStatus: () =>
    request(`${API_BASE_URL}/intern/clock-status`),

  dispute: (timelogId, body) =>
    request(`${API_BASE_URL}/supervisor/timelogs/${timelogId}/dispute`, {
      method: 'PATCH',
      body: JSON.stringify(body), // { is_disputed: bool, dispute_reason: string }
    }),
};

/* ══════════════════════════════════════════════
   DOCUMENT TYPES (REQUIREMENTS)
   ══════════════════════════════════════════════ */
export const documentTypesApi = {
  list: (params) =>
    request(buildUrl('/document-types', params)),
  // params: is_active, is_required

  get: (typeId) =>
    request(`${API_BASE_URL}/document-types/${typeId}`),

  create: (body) =>
    request(`${API_BASE_URL}/document-types`, {
      method: 'POST',
      body: JSON.stringify(body), // { name, description, is_required }
    }),

  update: (typeId, body) =>
    request(`${API_BASE_URL}/document-types/${typeId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  toggleActive: (typeId) =>
    request(`${API_BASE_URL}/document-types/${typeId}/toggle-active`, { method: 'PATCH' }),
};

/* ══════════════════════════════════════════════
   DOCUMENTS (SUBMISSIONS)
   ══════════════════════════════════════════════ */
export const documentsApi = {
  list: (params) =>
    request(buildUrl('/documents', params)),
  // params: intern_id, document_type_id, status

  updateStatus: (documentId, body) =>
    request(`${API_BASE_URL}/documents/${documentId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(body), // { status, remarks }
    }),

  getInternRequirements: (internId) =>
    request(`${API_BASE_URL}/interns/${internId}/requirements`),
  // Merged view of document_types + intern's current submissions

  adminMark: (intern_id, document_type_id, status) =>
    request(`${API_BASE_URL}/admin/intern-requirements`, {
      method: 'PATCH',
      body: JSON.stringify({ intern_id, document_type_id, status }),
    }),
};

/* ══════════════════════════════════════════════
   ACTIVITIES (LMS-STYLE SUBMISSIONS)
   ══════════════════════════════════════════════ */
export const activitiesApi = {
  // Supervisor
  supervisorList: () =>
    request(`${API_BASE_URL}/supervisor/activities`),

  create: (body) =>
    request(`${API_BASE_URL}/supervisor/activities`, {
      method: 'POST',
      body: JSON.stringify(body), // { title, description, due_date, is_graded }
    }),

  update: (activityId, body) =>
    request(`${API_BASE_URL}/supervisor/activities/${activityId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  toggleActive: (activityId) =>
    request(`${API_BASE_URL}/supervisor/activities/${activityId}/toggle`, {
      method: 'PATCH',
    }),

  listSubmissions: (activityId) =>
    request(`${API_BASE_URL}/supervisor/activities/${activityId}/submissions`),

  gradeSubmission: (submissionId, body) =>
    request(`${API_BASE_URL}/supervisor/submissions/${submissionId}`, {
      method: 'PATCH',
      body: JSON.stringify(body), // { grade, feedback }
    }),

  // Intern
  internList: () =>
    request(`${API_BASE_URL}/intern/activities`),

  submit: (activityId, formData) =>
    request(`${API_BASE_URL}/intern/activities/${activityId}/submit`, {
      method: 'POST',
      body: formData, // FormData with 'files[]'
    }),

  // Supervisor: upload instruction files (FormData with 'files[]')
  uploadInstructionFiles: (activityId, formData) =>
    request(`${API_BASE_URL}/supervisor/activities/${activityId}/files`, {
      method: 'POST',
      body: formData,
    }),

  // Supervisor: delete one instruction file
  deleteInstructionFile: (activityId, fileId) =>
    request(`${API_BASE_URL}/supervisor/activities/${activityId}/files/${fileId}`, {
      method: 'DELETE',
    }),

  // Shared — returns a fetch-ready URL with auth token
  downloadUrl: (fileId) =>
    `${API_BASE_URL}/files/${fileId}/download`,

  // Convenience: authenticated download that triggers browser save
  download: async (fileId, suggestedName) => {
    const token = localStorage.getItem('auth_token') ?? sessionStorage.getItem('auth_token');
    const res = await fetch(`${API_BASE_URL}/files/${fileId}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error(`Download failed: ${res.status}`);
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = suggestedName || 'file';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};

/* ══════════════════════════════════════════════
   NOTIFICATIONS
   ══════════════════════════════════════════════ */
export const notificationsApi = {
  list: (params) => request(buildUrl('/notifications', params)),
  unreadCount: () => request(`${API_BASE_URL}/notifications?unread_count=1`),
  markRead: (notificationId) => request(`${API_BASE_URL}/notifications/${notificationId}/read`, { method: 'PATCH' }),
  markAllRead: (userId) => request(`${API_BASE_URL}/notifications/read-all`, { method: 'PATCH', body: JSON.stringify({ user_id: userId }) }),
  create: (body) => request(`${API_BASE_URL}/notifications`, { method: 'POST', body: JSON.stringify(body) }),
};

/* ══════════════════════════════════════════════
   AUDIT LOGS
   ══════════════════════════════════════════════ */
export const auditLogsApi = {
  list: (params) => request(buildUrl('/admin/audit-logs', params)),
  get: (logId) => request(`${API_BASE_URL}/audit-logs/${logId}`),
  create: (body) => request(`${API_BASE_URL}/audit-logs`, { method: 'POST', body: JSON.stringify(body) }),
};

/* ══════════════════════════════════════════════
   DASHBOARD
   ══════════════════════════════════════════════ */
export const dashboardApi = {
  adminStats: (params) => request(buildUrl('/admin/dashboard', params)),
  supervisorStats: (params) => request(buildUrl('/supervisor/dashboard', params)),
  internStats: (params) => request(buildUrl('/intern/dashboard', params)),
};

/* ══════════════════════════════════════════════
   PROFILE
   ══════════════════════════════════════════════ */
export const profileApi = {
  get: () => request(`${API_BASE_URL}/profile`),
  update: (body) => request(`${API_BASE_URL}/profile`, { method: 'POST', body: JSON.stringify(body) }),
  updatePhoto: (formData) => request(`${API_BASE_URL}/profile`, { method: 'POST', body: formData }),
  updateSecurity: (body) => request(`${API_BASE_URL}/profile/security`, { method: 'POST', body: JSON.stringify(body) }),
};
