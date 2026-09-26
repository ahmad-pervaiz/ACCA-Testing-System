/**
 * RISE School of Accountancy — ACCA CBT backend on Google Sheets.
 *
 * This IS the database and the trust boundary — it plays the role Postgres +
 * Row Level Security + a service-role key played in the paid version:
 *   - getMockForExam never returns CorrectOption/Explanation
 *   - submitExam re-reads the answer key itself and grades server-side; it
 *     never trusts a score sent by the browser
 *   - every write that a teacher makes requires TEACHER_TOKEN; every write a
 *     student makes is scoped to their own mockId+accaId
 *   - students are real accounts: RISE/ACCA ID + email + salted-SHA-256
 *     password hash in the Students sheet (RISE has no institutional email
 *     to derive a login from the way the paid version did, so students
 *     register with any email of their own — see registerStudent_)
 *
 * SETUP (one time):
 *   1. Create a new Google Sheet. Extensions -> Apps Script.
 *   2. Delete the default code, paste this whole file in.
 *   3. Run the `setup` function once (Run menu -> select "setup" -> Run).
 *      Grant the permissions it asks for. Check View -> Logs (or Executions)
 *      for a line like "TEACHER_TOKEN = xxxxxxxx" — copy that value into
 *      GOOGLE_SCRIPT_TEACHER_TOKEN in your Next.js .env.local.
 *   4. Deploy -> New deployment -> type "Web app".
 *        Execute as: Me
 *        Who has access: Anyone
 *      Copy the "Web app URL" into NEXT_PUBLIC_GOOGLE_SCRIPT_URL in
 *      .env.local (the app calls it from Next.js server code only, never
 *      from the browser, despite the NEXT_PUBLIC_ prefix — that name is
 *      just to match the variable the project spec asked for).
 *   5. Whenever you edit this script, you must create a NEW deployment (or
 *      "Manage deployments" -> edit -> new version) for changes to go live.
 */

const SHEET_MOCKS = "Mocks";
const SHEET_RESULTS = "Results";
const SHEET_SESSIONS = "Sessions";
const SHEET_STUDENTS = "Students";

const MOCKS_HEADERS = [
  "MockID", "MockName", "Subject", "TeacherName", "TimeLimitMinutes",
  "TotalMarks", "PassPercentage", "Batches", "Status", "QuestionsJSON",
  "CreatedAt", "UpdatedAt",
];

const RESULTS_HEADERS = [
  "MockID", "MockName", "StudentName", "AccaId", "Batch", "MarksObtained",
  "TotalMarks", "Percentage", "CorrectCount", "IncorrectCount",
  "UnattemptedCount", "TimeTakenSeconds", "SubmissionTime", "ResponsesJSON",
];

const SESSIONS_HEADERS = [
  "MockID", "AccaId", "StudentName", "Batch", "StartedAt", "DeadlineAt",
  "CurrentQuestion", "ResponsesJSON", "FlaggedJSON", "Submitted",
];

const STUDENTS_HEADERS = [
  "AccaId", "FullName", "Email", "Batch", "PasswordHash", "PasswordSalt", "CreatedAt",
];

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheet_(ss, SHEET_MOCKS, MOCKS_HEADERS);
  ensureSheet_(ss, SHEET_RESULTS, RESULTS_HEADERS);
  ensureSheet_(ss, SHEET_SESSIONS, SESSIONS_HEADERS);
  ensureSheet_(ss, SHEET_STUDENTS, STUDENTS_HEADERS);

  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty("TEACHER_TOKEN")) {
    const token = Utilities.getUuid().replace(/-/g, "");
    props.setProperty("TEACHER_TOKEN", token);
    Logger.log("Generated TEACHER_TOKEN = " + token);
    Logger.log("Copy this into GOOGLE_SCRIPT_TEACHER_TOKEN in .env.local");
  } else {
    Logger.log("TEACHER_TOKEN already set = " + props.getProperty("TEACHER_TOKEN"));
  }
}

function ensureSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// ---------------------------------------------------------------------------
// HTTP entry points
// ---------------------------------------------------------------------------

function doGet(e) {
  return handle_(function () {
    const action = e.parameter.action;
    switch (action) {
      case "listMocksForBatch":
        return listMocksForBatch_(e.parameter.batch);
      case "listAllMocksForTeacher":
        requireTeacher_(e.parameter.teacherToken);
        return listAllMocks_();
      case "getMockMeta":
        return getMockMeta_(e.parameter.id);
      case "getMockForExam":
        return getMockForExam_(e.parameter.id);
      case "getMockForReview":
        return getMockForReview_(e.parameter.id, e.parameter.accaId);
      case "getMockForEdit":
        requireTeacher_(e.parameter.teacherToken);
        return getMockFull_(e.parameter.id);
      case "getSession":
        return getSession_(e.parameter.mockId, e.parameter.accaId);
      case "getResult":
        return getResult_(e.parameter.mockId, e.parameter.accaId);
      case "listResultsForStudent":
        return listResultsForStudent_(e.parameter.accaId);
      case "listResultsForTeacher":
        requireTeacher_(e.parameter.teacherToken);
        return listResults_();
      case "debugSheet":
        requireTeacher_(e.parameter.teacherToken);
        return debugSheet_(e.parameter.name);
      default:
        throw new Error("Unknown action: " + action);
    }
  });
}

function doPost(e) {
  return handle_(function () {
    const body = JSON.parse(e.postData.contents);
    switch (body.action) {
      case "createDraftMock":
        requireTeacher_(body.teacherToken);
        return createDraftMock_(body);
      case "updateMock":
        requireTeacher_(body.teacherToken);
        return updateMock_(body);
      case "publishMock":
        requireTeacher_(body.teacherToken);
        return setMockStatus_(body.id, "published");
      case "archiveMock":
        requireTeacher_(body.teacherToken);
        return setMockStatus_(body.id, "archived");
      case "registerStudent":
        return registerStudent_(body);
      case "studentLogin":
        return studentLogin_(body);
      case "beginExam":
        return beginExam_(body);
      case "saveProgress":
        return saveProgress_(body);
      case "submitExam":
        return submitExam_(body);
      default:
        throw new Error("Unknown action: " + body.action);
    }
  });
}

function handle_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const data = fn();
    return jsonOut_({ success: true, data: data });
  } catch (err) {
    return jsonOut_({ success: false, error: String(err && err.message ? err.message : err) });
  } finally {
    lock.releaseLock();
  }
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function requireTeacher_(token) {
  const expected = PropertiesService.getScriptProperties().getProperty("TEACHER_TOKEN");
  if (!expected || token !== expected) {
    throw new Error("Not authorized.");
  }
}

// ---------------------------------------------------------------------------
// Sheet <-> object helpers
// ---------------------------------------------------------------------------

function sheet_(name) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) throw new Error("Sheet not found: " + name);
  return sheet;
}

/** Reads all data rows (excluding header) as an array of {header: value} objects, with each row's 1-based sheet row number attached as `_row`. */
function readRows_(sheet) {
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const row = {};
    for (let c = 0; c < headers.length; c++) row[headers[c]] = values[i][c];
    row._row = i + 1;
    rows.push(row);
  }
  return rows;
}

function findRow_(sheet, predicate) {
  const rows = readRows_(sheet);
  for (let i = 0; i < rows.length; i++) {
    if (predicate(rows[i])) return rows[i];
  }
  return null;
}

/** Temporary diagnostic — raw header row + row count + first data row for
 * any sheet by name, so a header mismatch or wrong-tab issue is visible
 * without needing screenshots. Teacher-token gated; safe to leave in. */
function debugSheet_(name) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) {
    return {
      error: "No sheet named \"" + name + "\"",
      allSheetNames: SpreadsheetApp.getActiveSpreadsheet().getSheets().map(function (s) {
        return s.getName();
      }),
    };
  }
  const values = sheet.getDataRange().getValues();
  return {
    sheetName: sheet.getName(),
    lastRow: sheet.getLastRow(),
    lastColumn: sheet.getLastColumn(),
    headerRow: values[0] || [],
    firstDataRow: values[1] || null,
    totalRowsIncludingHeader: values.length,
  };
}

// ---------------------------------------------------------------------------
// Students (real accounts — email + password, since RISE has no institutional
// email to derive a login from; students log in with their RISE/ACCA ID)
// ---------------------------------------------------------------------------

/** Salted SHA-256. Not bcrypt/argon2 (Apps Script has no such library), but
 * far better than storing plaintext — a reasonable trade-off for a free,
 * zero-infrastructure backend. Document this if you audit the sheet. */
function hashPassword_(password, salt) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password + ":" + salt);
  return bytes
    .map(function (b) {
      const unsigned = (b + 256) % 256;
      const hex = unsigned.toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    })
    .join("");
}

function findStudentByAccaId_(accaId) {
  return findRow_(sheet_(SHEET_STUDENTS), function (r) {
    return String(r.AccaId).toLowerCase() === String(accaId).toLowerCase();
  });
}

function findStudentByEmail_(email) {
  return findRow_(sheet_(SHEET_STUDENTS), function (r) {
    return String(r.Email).toLowerCase() === String(email).toLowerCase();
  });
}

function studentRowToPublic_(row) {
  return { full_name: row.FullName, email: row.Email, acca_id: row.AccaId, batch: row.Batch };
}

function registerStudent_(body) {
  const accaId = String(body.accaId || "").trim();
  const email = String(body.email || "").trim();
  const fullName = String(body.fullName || "").trim();
  const batch = String(body.batch || "").trim();
  const password = String(body.password || "");

  if (!accaId || !email || !fullName || !batch || !password) {
    throw new Error("All fields are required.");
  }
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  if (findStudentByAccaId_(accaId)) {
    throw new Error("An account with this RISE/ACCA ID already exists.");
  }
  if (findStudentByEmail_(email)) {
    throw new Error("An account with this email already exists.");
  }

  const salt = Utilities.getUuid();
  const hash = hashPassword_(password, salt);
  sheet_(SHEET_STUDENTS).appendRow([
    accaId, fullName, email, batch, hash, salt, new Date().toISOString(),
  ]);

  return studentRowToPublic_({ AccaId: accaId, FullName: fullName, Email: email, Batch: batch });
}

function studentLogin_(body) {
  const accaId = String(body.accaId || "").trim();
  const password = String(body.password || "");
  if (!accaId || !password) throw new Error("Enter your RISE/ACCA ID and password.");

  const row = findStudentByAccaId_(accaId);
  if (!row) throw new Error("Invalid RISE/ACCA ID or password.");

  const hash = hashPassword_(password, row.PasswordSalt);
  if (hash !== row.PasswordHash) throw new Error("Invalid RISE/ACCA ID or password.");

  return studentRowToPublic_(row);
}

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

function mockRowToObject_(row) {
  return {
    id: row.MockID,
    mock_name: row.MockName,
    subject: row.Subject,
    teacher_name: row.TeacherName,
    time_limit_minutes: Number(row.TimeLimitMinutes),
    total_marks: Number(row.TotalMarks),
    pass_percentage: Number(row.PassPercentage),
    batches: row.Batches ? JSON.parse(row.Batches) : [],
    status: row.Status,
    created_at: row.CreatedAt,
  };
}

function listMocksForBatch_(batch) {
  const rows = readRows_(sheet_(SHEET_MOCKS));
  return rows
    .filter(function (r) {
      return r.Status === "published" && (JSON.parse(r.Batches || "[]")).indexOf(batch) !== -1;
    })
    .map(function (r) {
      const questions = JSON.parse(r.QuestionsJSON || "[]");
      const obj = mockRowToObject_(r);
      obj.total_questions = questions.length;
      return obj;
    });
}

function listAllMocks_() {
  const rows = readRows_(sheet_(SHEET_MOCKS));
  return rows.map(function (r) {
    const questions = JSON.parse(r.QuestionsJSON || "[]");
    const obj = mockRowToObject_(r);
    obj.total_questions = questions.length;
    return obj;
  });
}

function getMockRow_(id) {
  const row = findRow_(sheet_(SHEET_MOCKS), function (r) {
    return r.MockID === id;
  });
  if (!row) throw new Error("Mock not found.");
  return row;
}

function getMockMeta_(id) {
  const row = getMockRow_(id);
  const questions = JSON.parse(row.QuestionsJSON || "[]");
  const obj = mockRowToObject_(row);
  obj.total_questions = questions.length;
  return obj;
}

/** Strips CorrectOption/Explanation — this is the answer-key security boundary. */
function getMockForExam_(id) {
  const row = getMockRow_(id);
  const questions = JSON.parse(row.QuestionsJSON || "[]");
  return {
    id: row.MockID,
    mock_name: row.MockName,
    time_limit_minutes: Number(row.TimeLimitMinutes),
    questions: questions.map(function (q) {
      return {
        question_number: q.question_number,
        question_text: q.question_text,
        image_url: q.image_url || null,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        marks: q.marks,
      };
    }),
  };
}

function getMockFull_(id) {
  const row = getMockRow_(id);
  const obj = mockRowToObject_(row);
  obj.questions = JSON.parse(row.QuestionsJSON || "[]");
  return obj;
}

/** Reveals the answer key only to a student who has an actual submitted Results row for this mock — the post-submission review page. */
function getMockForReview_(id, accaId) {
  const hasResult = findRow_(sheet_(SHEET_RESULTS), function (r) {
    return r.MockID === id && r.AccaId === accaId;
  });
  if (!hasResult) throw new Error("No submitted result found for this mock and student.");
  return getMockFull_(id);
}

function createDraftMock_(body) {
  const sheet = sheet_(SHEET_MOCKS);
  const id = Utilities.getUuid();
  const now = new Date().toISOString();
  const questions = body.questions || [];
  sheet.appendRow([
    id,
    body.mock_name,
    body.subject,
    body.teacher_name || "Ali Pervaiz",
    body.time_limit_minutes || 120,
    questions.reduce(function (s, q) { return s + (Number(q.marks) || 0); }, 0),
    body.pass_percentage || 50,
    JSON.stringify(body.batches || []),
    "draft",
    JSON.stringify(questions),
    now,
    now,
  ]);
  return { id: id };
}

function updateMock_(body) {
  const row = getMockRow_(body.id);
  const sheet = sheet_(SHEET_MOCKS);
  const questions = body.questions || [];
  const totalMarks = questions.reduce(function (s, q) { return s + (Number(q.marks) || 0); }, 0);
  const values = [
    row.MockID,
    body.mock_name,
    body.subject,
    row.TeacherName,
    body.time_limit_minutes,
    totalMarks,
    body.pass_percentage,
    JSON.stringify(body.batches || []),
    row.Status,
    JSON.stringify(questions),
    row.CreatedAt,
    new Date().toISOString(),
  ];
  sheet.getRange(row._row, 1, 1, values.length).setValues([values]);
  return { id: row.MockID };
}

function setMockStatus_(id, status) {
  const row = getMockRow_(id);
  if (status === "published") {
    const batches = JSON.parse(row.Batches || "[]");
    const questions = JSON.parse(row.QuestionsJSON || "[]");
    if (batches.length === 0) throw new Error("Assign at least one batch before publishing.");
    if (questions.length === 0) throw new Error("This mock has no questions.");
  }
  const sheet = sheet_(SHEET_MOCKS);
  sheet.getRange(row._row, MOCKS_HEADERS.indexOf("Status") + 1).setValue(status);
  sheet.getRange(row._row, MOCKS_HEADERS.indexOf("UpdatedAt") + 1).setValue(new Date().toISOString());
  return { id: id, status: status };
}

// ---------------------------------------------------------------------------
// Sessions (server-anchored exam timer + autosave)
// ---------------------------------------------------------------------------

function sessionRowToObject_(row) {
  return {
    mock_id: row.MockID,
    acca_id: row.AccaId,
    started_at: row.StartedAt,
    deadline_at: row.DeadlineAt,
    current_question: Number(row.CurrentQuestion) || 1,
    responses: row.ResponsesJSON ? JSON.parse(row.ResponsesJSON) : {},
    flagged: row.FlaggedJSON ? JSON.parse(row.FlaggedJSON) : [],
    submitted: row.Submitted === true || row.Submitted === "TRUE",
  };
}

function findSessionRow_(mockId, accaId) {
  return findRow_(sheet_(SHEET_SESSIONS), function (r) {
    return r.MockID === mockId && r.AccaId === accaId;
  });
}

function getSession_(mockId, accaId) {
  const row = findSessionRow_(mockId, accaId);
  return row ? sessionRowToObject_(row) : null;
}

function beginExam_(body) {
  const existingResult = findRow_(sheet_(SHEET_RESULTS), function (r) {
    return r.MockID === body.mockId && r.AccaId === body.accaId;
  });
  if (existingResult) {
    throw new Error("You have already completed this mock.");
  }

  const existing = findSessionRow_(body.mockId, body.accaId);
  if (existing) return sessionRowToObject_(existing);

  const mockRow = getMockRow_(body.mockId);
  if (mockRow.Status !== "published") throw new Error("This mock is not published.");
  const batches = JSON.parse(mockRow.Batches || "[]");
  if (batches.indexOf(body.batch) === -1) {
    throw new Error("This mock is not assigned to your batch.");
  }

  const now = new Date();
  const deadline = new Date(now.getTime() + Number(mockRow.TimeLimitMinutes) * 60000);
  const sheet = sheet_(SHEET_SESSIONS);
  sheet.appendRow([
    body.mockId,
    body.accaId,
    body.studentName,
    body.batch,
    now.toISOString(),
    deadline.toISOString(),
    1,
    "{}",
    "[]",
    false,
  ]);
  return getSession_(body.mockId, body.accaId);
}

function saveProgress_(body) {
  const row = findSessionRow_(body.mockId, body.accaId);
  if (!row || row.Submitted === true || row.Submitted === "TRUE") {
    return { ok: false };
  }
  const sheet = sheet_(SHEET_SESSIONS);
  sheet.getRange(row._row, SESSIONS_HEADERS.indexOf("CurrentQuestion") + 1, 1, 3).setValues([
    [body.currentQuestion, JSON.stringify(body.responses || {}), JSON.stringify(body.flagged || [])],
  ]);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Results (server-side grading — the client score is never trusted)
// ---------------------------------------------------------------------------

function resultRowToObject_(row) {
  return {
    mock_id: row.MockID,
    mock_name: row.MockName,
    student_name: row.StudentName,
    acca_id: row.AccaId,
    batch: row.Batch,
    marks_obtained: Number(row.MarksObtained),
    total_marks: Number(row.TotalMarks),
    percentage: Number(row.Percentage),
    correct_count: Number(row.CorrectCount),
    incorrect_count: Number(row.IncorrectCount),
    unattempted_count: Number(row.UnattemptedCount),
    time_taken_seconds: Number(row.TimeTakenSeconds),
    submission_time: row.SubmissionTime,
    student_responses: row.ResponsesJSON ? JSON.parse(row.ResponsesJSON) : {},
  };
}

function getResult_(mockId, accaId) {
  const row = findRow_(sheet_(SHEET_RESULTS), function (r) {
    return r.MockID === mockId && r.AccaId === accaId;
  });
  return row ? resultRowToObject_(row) : null;
}

function listResults_() {
  return readRows_(sheet_(SHEET_RESULTS)).map(resultRowToObject_);
}

function listResultsForStudent_(accaId) {
  return readRows_(sheet_(SHEET_RESULTS))
    .filter(function (r) { return r.AccaId === accaId; })
    .map(resultRowToObject_);
}

function submitExam_(body) {
  const existing = findRow_(sheet_(SHEET_RESULTS), function (r) {
    return r.MockID === body.mockId && r.AccaId === body.accaId;
  });
  if (existing) return resultRowToObject_(existing);

  const mockRow = getMockRow_(body.mockId);
  const questions = JSON.parse(mockRow.QuestionsJSON || "[]");
  const responses = body.responses || {};

  let marksObtained = 0;
  let totalMarks = 0;
  let correct = 0;
  let incorrect = 0;
  let unattempted = 0;

  questions.forEach(function (q) {
    totalMarks += Number(q.marks);
    const given = responses[String(q.question_number)];
    if (!given) {
      unattempted += 1;
    } else if (given === q.correct_option) {
      correct += 1;
      marksObtained += Number(q.marks);
    } else {
      incorrect += 1;
    }
  });

  const percentage = totalMarks > 0 ? Math.round((marksObtained / totalMarks) * 10000) / 100 : 0;

  const sessionRow = findSessionRow_(body.mockId, body.accaId);
  const startedAt = sessionRow ? new Date(sessionRow.StartedAt) : new Date();
  const timeTakenSeconds = Math.max(0, Math.round((Date.now() - startedAt.getTime()) / 1000));
  const submissionTime = new Date().toISOString();

  sheet_(SHEET_RESULTS).appendRow([
    body.mockId,
    mockRow.MockName,
    body.studentName,
    body.accaId,
    body.batch,
    marksObtained,
    totalMarks,
    percentage,
    correct,
    incorrect,
    unattempted,
    timeTakenSeconds,
    submissionTime,
    JSON.stringify(responses),
  ]);

  if (sessionRow) {
    const sheet = sheet_(SHEET_SESSIONS);
    sheet.getRange(sessionRow._row, SESSIONS_HEADERS.indexOf("Submitted") + 1).setValue(true);
  }

  return {
    mock_id: body.mockId,
    mock_name: mockRow.MockName,
    student_name: body.studentName,
    acca_id: body.accaId,
    batch: body.batch,
    marks_obtained: marksObtained,
    total_marks: totalMarks,
    percentage: percentage,
    correct_count: correct,
    incorrect_count: incorrect,
    unattempted_count: unattempted,
    time_taken_seconds: timeTakenSeconds,
    submission_time: submissionTime,
    student_responses: responses,
  };
}
