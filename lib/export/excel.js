import ExcelJS from 'exceljs';

/**
 * Generate Excel buffer from submission rows
 * @param {object[]} submissions
 * @param {string} testTitle
 */
export async function generateExcel(submissions, testTitle) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'DevLab';
  wb.created = new Date();

  const ws = wb.addWorksheet('Results');

  ws.columns = [
    { header: 'Student Name',      key: 'name',          width: 24 },
    { header: 'Email',             key: 'email',         width: 30 },
    { header: 'Score',             key: 'score',         width: 10 },
    { header: 'Max Score',         key: 'max_score',     width: 12 },
    { header: 'Percentage',        key: 'pct',           width: 13 },
    { header: 'Status',            key: 'status',        width: 14 },
    { header: 'Submitted At',      key: 'submitted_at',  width: 22 },
  ];

  // Style header row
  ws.getRow(1).eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  for (const s of submissions) {
    const pct = s.max_score > 0 ? Math.round((s.total_score / s.max_score) * 100) : 0;
    ws.addRow({
      name:         s.users?.name ?? '—',
      email:        s.users?.email ?? '—',
      score:        s.total_score ?? 0,
      max_score:    s.max_score ?? 0,
      pct:          `${pct}%`,
      status:       s.status,
      submitted_at: s.submitted_at ? new Date(s.submitted_at).toLocaleString() : '—',
    });
  }

  // Freeze header row
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  // Add detailed per-question sheet
  const qws = wb.addWorksheet('Question Details');
  qws.columns = [
    { header: 'Student Name', key: 'name', width: 24 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Question ID', key: 'qid', width: 36 },
    { header: 'Prompt', key: 'prompt', width: 60 },
    { header: 'Question Points', key: 'qpoints', width: 12 },
    { header: 'Partial Enabled', key: 'partial', width: 12 },
    { header: 'Student Query', key: 'query', width: 60 },
    { header: 'Actual Output', key: 'actual', width: 60 },
    { header: 'Expected Output', key: 'expected', width: 60 },
    { header: 'Answer Score', key: 'ans_score', width: 12 },
  ];

  for (const s of submissions) {
    if (!s.submission_answers || !s.submission_answers.length) continue;
    for (const a of s.submission_answers) {
      qws.addRow({
        name:     s.users?.name ?? '—',
        email:    s.users?.email ?? '—',
        qid:      a.questions?.id ?? '',
        prompt:   a.questions?.prompt ?? '',
        qpoints:  a.questions?.points ?? '',
        partial:  a.questions?.partial_grading ? 'true' : 'false',
        query:    a.query_text ?? '',
        actual:   a.actual_output ? JSON.stringify(a.actual_output) : '',
        expected: a.questions?.expected_output ? JSON.stringify(a.questions.expected_output) : '',
        ans_score: a.score ?? 0,
      });
    }
  }

  const buf = await wb.xlsx.writeBuffer();
  return buf;
}
