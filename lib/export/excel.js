import ExcelJS from 'exceljs'

export async function generateExcel(submissions, testTitle) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'DevLab'
  wb.created = new Date()

  const ws = wb.addWorksheet('Results')

  ws.columns = [
    { header: 'Test Title', key: 'test_title', width: 28 },
    { header: 'Student Name', key: 'name', width: 24 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Score', key: 'score', width: 10 },
    { header: 'Max Score', key: 'max_score', width: 12 },
    { header: 'Percentage', key: 'pct', width: 13 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Submitted At', key: 'submitted_at', width: 22 },
  ]

  ws.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
  })

  for (const submission of submissions) {
    const pct = submission.max_score > 0
      ? Math.round((submission.total_score / submission.max_score) * 100)
      : 0

    ws.addRow({
      test_title: testTitle,
      name: submission.users?.name ?? '-',
      email: submission.users?.email ?? '-',
      score: submission.total_score ?? 0,
      max_score: submission.max_score ?? 0,
      pct: `${pct}%`,
      status: submission.status,
      submitted_at: submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : '-',
    })
  }

  ws.views = [{ state: 'frozen', ySplit: 1 }]

  const qws = wb.addWorksheet('Question Details')
  qws.columns = [
    { header: 'Test Title', key: 'test_title', width: 28 },
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
  ]

  qws.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
  })

  for (const submission of submissions) {
    for (const answer of submission.submission_answers || []) {
      qws.addRow({
        test_title: testTitle,
        name: submission.users?.name ?? '-',
        email: submission.users?.email ?? '-',
        qid: answer.questions?.id ?? '',
        prompt: answer.questions?.prompt ?? '',
        qpoints: answer.questions?.points ?? '',
        partial: answer.questions?.partial_grading ? 'true' : 'false',
        query: answer.query_text ?? '',
        actual: answer.actual_output ? JSON.stringify(answer.actual_output) : '',
        expected: answer.questions?.expected_output ? JSON.stringify(answer.questions.expected_output) : '',
        ans_score: answer.score ?? 0,
      })
    }
  }

  return wb.xlsx.writeBuffer()
}
