import { prisma } from '@/lib/prisma';
import { CreateFolder } from '@/components/CreateFolder';
import { FolderActions } from '@/components/FolderActions';
import { currentUser } from '@/lib/auth';
import { Plus } from 'lucide-react';
import { RepositoryList } from '@/components/RepositoryList';
import { canModerate } from '@/lib/permissions';
import { AnswerResolver } from '@/components/AnswerResolver';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export default async function FolderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [children, questions, folder, destinations, user] = await Promise.all([
    prisma.folder.findMany({ where: { parentId: id }, orderBy: { name: 'asc' } }),
    prisma.question.findMany({ where: { folderId: id }, include: { choices: { orderBy: { createdAt: 'asc' } } }, orderBy: { createdAt: 'asc' } }),
    prisma.folder.findUnique({ where: { id } }),
    prisma.folder.findMany({ select: { id: true, name: true, teamId: true }, orderBy: { name: 'asc' } }),
    currentUser()
  ]);
  return <>
    <RepositoryList folders={children.map(child => ({ ...child, canRename: canModerate(user) || child.creatorId === user?.id }))} action={<details className="new-folder"><summary className="button"><Plus size={14} /> New {folder?.parentId ? 'subfolder' : 'folder'}</summary><CreateFolder parentId={id} /></details>} />
    <section className="panel repository-questions"><div className="repository-questions-heading"><div><p className="eyebrow">QUESTION BANK</p><h2>Questions <span>{questions.length}</span></h2></div></div>
      {questions.length ? <div className="repository-question-list">{questions.map((question, index) => {
        const knownAnswer = question.choices.some(choice => choice.isCorrect === true);
        const userAnswer = question.answerSource === 'USER';
        const canResolve = !!user?.teamId && folder?.teamId === user.teamId && !question.hasConflict &&
          (userAnswer || (!question.isVerified && !knownAnswer)) &&
          ['MULTIPLE_CHOICE', 'MULTIPLE_ANSWERS', 'TRUE_FALSE'].includes(question.questionType) &&
          question.choices.some(choice => userAnswer || choice.isCorrect !== false);
        return <article className="repository-question-card" key={question.id}>
          <div className="repository-question-top"><span className="repository-question-index">{String(index + 1).padStart(2, '0')}</span><span className={`repository-answer-status ${knownAnswer && !question.hasConflict ? 'known' : ''}`}>{question.hasConflict ? 'Needs answer review' : userAnswer ? 'Team answer' : knownAnswer ? 'Answer saved' : 'Answer not revealed'}</span></div>
          <h3>{question.plainText}</h3>
          {canResolve ? <AnswerResolver key={`${question.answerSource ?? 'NONE'}:${question.choices.filter(choice => choice.isCorrect === true).map(choice => choice.id).join(',')}`} questionId={question.id} multiple={question.questionType === 'MULTIPLE_ANSWERS'} editable={userAnswer} choices={question.choices.map(choice => ({ id: choice.id, text: choice.text, isCorrect: choice.isCorrect }))} /> :
            question.choices.length ? <ol className="repository-choice-list">{question.choices.map((choice, choiceIndex) => <li className={choice.isCorrect === true ? 'choice-correct' : choice.isCorrect === false ? 'choice-incorrect' : ''} key={choice.id}><span className="choice-letter">{String.fromCharCode(65 + choiceIndex)}</span><span className="choice-text">{choice.text}</span>{choice.isCorrect === true && <strong>Correct</strong>}{choice.isCorrect === false && <small>Wrong</small>}</li>)}</ol> : <p className="muted">No answer choices were captured for this question.</p>}
          {question.explanation && <p className="repository-explanation"><strong>Feedback</strong>{question.explanation}</p>}
        </article>;
      })}</div> : <p className="muted">No questions in this folder yet.</p>}
    </section>
    {folder && user && (canModerate(user) || user.id === folder.creatorId) && <FolderActions id={id} initialName={folder.name} parentId={folder.parentId} destinations={destinations.filter(destination => destination.teamId === user.teamId)} />}
  </>;
}
