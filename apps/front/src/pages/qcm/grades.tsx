import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import Layout from '@/components/Layout';
import AdminRouteGuard from '@/components/AdminRouteGuard';
import { layout } from '@/config/layout';
import {
  apiListClasses,
  apiGetClassGrades,
  apiGetClassQuizGrades,
  apiUpdateGradeAnswers,
  apiUpdateQuizCoefficient,
  type ClassGradesMacroDto,
  type ClassQuizGradeDetailDto,
} from '@/qcm/apiClient';
import {
  buildClassGradesCsv,
  buildClassGradesCsvFilename,
} from '@kahin/qcm-application';
import { getErrorMessage } from '@kahin/shared-utils';

type ClassSummary = { id: string; name: string; studentCount: number };

function formatPercent(ratio: number | null | undefined): string {
  if (ratio == null || Number.isNaN(ratio)) return '—';
  return `${Math.round(ratio * 1000) / 10} %`;
}

function GradesPageContent() {
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [classId, setClassId] = useState('');
  const [macro, setMacro] = useState<ClassGradesMacroDto | null>(null);
  const [detail, setDetail] = useState<ClassQuizGradeDetailDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coefDrafts, setCoefDrafts] = useState<Record<string, string>>({});

  const loadClasses = useCallback(async () => {
    try {
      const list = await apiListClasses.execute();
      setClasses(list);
      if (!classId && list.length > 0) setClassId(list[0].id);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }, [classId]);

  const loadMacro = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setDetail(null);
    try {
      const data = await apiGetClassGrades.execute(id);
      setMacro(data);
      const drafts: Record<string, string> = {};
      for (const q of data.quizzes) {
        drafts[q.quizId] = String(q.coefficient);
      }
      setCoefDrafts(drafts);
    } catch (e) {
      setError(getErrorMessage(e));
      setMacro(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClasses();
  }, [loadClasses]);

  useEffect(() => {
    if (classId) void loadMacro(classId);
  }, [classId, loadMacro]);

  const openDetail = async (quizId: string, attemptId?: string) => {
    if (!classId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiGetClassQuizGrades.execute(
        classId,
        quizId,
        attemptId
      );
      setDetail(data);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const saveCoefficient = async (quizId: string) => {
    const raw = coefDrafts[quizId];
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) {
      setError('Le coefficient doit être un nombre positif');
      return;
    }
    try {
      await apiUpdateQuizCoefficient.execute(quizId, n);
      await loadMacro(classId);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const toggleDetailAnswer = async (
    studentName: string,
    questionId: string,
    nextCorrect: boolean
  ) => {
    if (!detail) return;
    try {
      const updated = await apiUpdateGradeAnswers.execute(detail.attempt.id, [
        {
          studentName,
          questionId,
          isCorrect: nextCorrect,
          points: nextCorrect ? 1 : 0,
        },
      ]);
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              attempt: {
                ...updated,
                completedAt: updated.completedAt,
              },
            }
          : prev
      );
      await loadMacro(classId);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const detailByStudent = useMemo(() => {
    if (!detail) return new Map<string, Map<string, { isCorrect: boolean; points: number }>>();
    const map = new Map<
      string,
      Map<string, { isCorrect: boolean; points: number }>
    >();
    for (const d of detail.attempt.details) {
      let inner = map.get(d.studentName);
      if (!inner) {
        inner = new Map();
        map.set(d.studentName, inner);
      }
      inner.set(d.questionId, { isCorrect: d.isCorrect, points: d.points });
    }
    return map;
  }, [detail]);

  const handleExportCsv = () => {
    if (!macro) return;
    const csv = buildClassGradesCsv({
      className: macro.className,
      students: macro.students,
      quizzes: macro.quizzes.map((q) => ({
        quizTitle: q.quizTitle,
        coefficient: q.coefficient,
        scoresByStudent: q.scoresByStudent,
      })),
      averagesByStudent: macro.averagesByStudent,
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objUrl;
    a.download = buildClassGradesCsvFilename(macro.className);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objUrl);
  };

  return (
    <Layout>
      <Head>
        <title>Notes</title>
      </Head>
      <Box sx={{ ...layout.pagePaddingAuto, maxWidth: 1200 }}>
        <Typography variant="h4" gutterBottom>
          Notes
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Vue par classe : dernière tentative de chaque QCM (questions « cours »
          uniquement). Cliquez un QCM pour le détail et l’édition.
        </Typography>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          sx={{ mb: 2 }}
        >
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel id="grades-class">Classe</InputLabel>
            <Select
              labelId="grades-class"
              label="Classe"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
            >
              {classes.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            onClick={handleExportCsv}
            disabled={!macro || macro.quizzes.length === 0}
          >
            Exporter CSV
          </Button>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading && !macro ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : null}

        {detail ? (
          <Box sx={{ mb: 3 }}>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ mb: 2 }}
            >
              <Button size="small" onClick={() => setDetail(null)}>
                ← Retour macro
              </Button>
              <Typography variant="h6">
                {detail.quizTitle} (coef. {detail.coefficient})
              </Typography>
            </Stack>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Élève</TableCell>
                    {detail.questions.map((q) => (
                      <TableCell key={q.id} sx={{ minWidth: 120 }}>
                        {q.label}
                      </TableCell>
                    ))}
                    <TableCell>Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {macro?.students.map((student) => {
                    const score = detail.attempt.scores.find(
                      (s) => s.studentName === student
                    );
                    return (
                      <TableRow key={student}>
                        <TableCell>{student}</TableCell>
                        {detail.questions.map((q) => {
                          const cell = detailByStudent
                            .get(student)
                            ?.get(q.id);
                          const checked = Boolean(cell?.isCorrect || (cell?.points ?? 0) > 0);
                          return (
                            <TableCell key={q.id} align="center">
                              <Checkbox
                                size="small"
                                checked={checked}
                                onChange={(e) =>
                                  void toggleDetailAnswer(
                                    student,
                                    q.id,
                                    e.target.checked
                                  )
                                }
                                inputProps={{
                                  'aria-label': `${student} — ${q.label}`,
                                }}
                              />
                            </TableCell>
                          );
                        })}
                        <TableCell>
                          {score
                            ? `${score.courseCorrect}/${score.courseTotal}`
                            : '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          </Box>
        ) : macro ? (
          <>
            {macro.quizzes.length === 0 ? (
              <Alert severity="info">
                Aucune note enregistrée pour cette classe. Terminez une session
                liée à la classe avec des questions en mode « cours ».
              </Alert>
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Élève</TableCell>
                      {macro.quizzes.map((q) => (
                        <TableCell key={q.quizId} sx={{ minWidth: 140 }}>
                          <Button
                            size="small"
                            onClick={() =>
                              void openDetail(q.quizId, q.attemptId)
                            }
                            sx={{ textTransform: 'none', fontWeight: 600 }}
                          >
                            {q.quizTitle}
                          </Button>
                          <Stack
                            direction="row"
                            spacing={0.5}
                            alignItems="center"
                            sx={{ mt: 0.5 }}
                          >
                            <TextField
                              size="small"
                              label="Coef"
                              value={coefDrafts[q.quizId] ?? String(q.coefficient)}
                              onChange={(e) =>
                                setCoefDrafts((prev) => ({
                                  ...prev,
                                  [q.quizId]: e.target.value,
                                }))
                              }
                              inputProps={{
                                style: { width: 48 },
                                'aria-label': `Coefficient ${q.quizTitle}`,
                              }}
                            />
                            <Button
                              size="small"
                              onClick={() => void saveCoefficient(q.quizId)}
                            >
                              OK
                            </Button>
                          </Stack>
                        </TableCell>
                      ))}
                      <TableCell>Moyenne</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {macro.students.map((student) => (
                      <TableRow key={student}>
                        <TableCell>{student}</TableCell>
                        {macro.quizzes.map((q) => {
                          const score = q.scoresByStudent[student];
                          return (
                            <TableCell key={q.quizId}>
                              {score
                                ? `${score.courseCorrect}/${score.courseTotal}`
                                : '—'}
                            </TableCell>
                          );
                        })}
                        <TableCell>
                          {formatPercent(macro.averagesByStudent[student])}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </>
        ) : null}
      </Box>
    </Layout>
  );
}

export default function GradesPage() {
  return (
    <AdminRouteGuard>
      <GradesPageContent />
    </AdminRouteGuard>
  );
}
