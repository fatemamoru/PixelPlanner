import { useMemo, useState } from 'react';
import { Button } from '../components/Button';
import { useServices } from '../app/AppContext';
import { useNotifications } from '../app/NotificationContext';
import { BUSINESS_TYPES, CONTENT_GOALS, TARGET_AUDIENCES } from '../domain/catalog';
import { validateCaption, validateCustomText } from '../core/validation';
import { newId } from '../core/id';
import type {
  BusinessType,
  CaptionSuggestion,
  ContentGoal,
  ContentIdea,
  TargetAudience,
} from '../domain/types';
import { MAX_CAPTIONS_PER_IDEA } from '../core/engine';
import styles from './views.module.css';

const MAX_RETRIES = 3;

export function CreateView() {
  const { session, engine, posts } = useServices();
  const { notifySuccess, notifyError } = useNotifications();

  // Selections mirror SessionService so the UI re-renders; SessionService is
  // the source of truth passed to the engine.
  const [businessType, setBusinessType] = useState<BusinessType | null>(
    session.getSelection().businessType,
  );
  const [targetAudience, setTargetAudience] = useState<TargetAudience | null>(
    session.getSelection().targetAudience,
  );
  const [contentGoal, setContentGoal] = useState<ContentGoal | null>(
    session.getSelection().contentGoal,
  );

  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [issued, setIssued] = useState<ContentIdea[]>([]);
  const [generating, setGenerating] = useState(false);
  const [ideaRetries, setIdeaRetries] = useState(0);

  // captions keyed by idea id
  const [captions, setCaptions] = useState<Record<string, CaptionSuggestion[]>>({});

  const chooseBusiness = (bt: BusinessType) => {
    setBusinessType(bt);
    session.setBusinessType(bt);
  };
  const chooseAudience = (ta: TargetAudience) => {
    setTargetAudience(ta);
    session.setTargetAudience(ta);
  };
  const chooseGoal = (g: ContentGoal | null) => {
    setContentGoal(g);
    session.setContentGoal(g);
  };

  const canGenerate = useMemo(
    () => session.canGenerate(),
    // re-evaluate when selections change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [businessType, targetAudience],
  );

  async function handleGenerate() {
    const check = session.canGenerate();
    if (!check.ok) {
      const parts: string[] = [];
      if (check.missing.includes('businessType')) parts.push('a business type');
      if (check.missing.includes('targetAudience')) parts.push('a target audience');
      notifyError(`Please select ${parts.join(' and ')} before generating content.`);
      return;
    }
    if (ideaRetries >= MAX_RETRIES) {
      notifyError('Idea generation has failed several times. Please try again later.');
      return;
    }
    setGenerating(true);
    try {
      const sel = session.getSelection();
      const next = await engine.generateIdeas(
        {
          businessType: sel.businessType!,
          targetAudience: sel.targetAudience!,
          contentGoal: sel.contentGoal,
        },
        issued,
      );
      setIdeas(next);
      setIssued((prev) => [...prev, ...next]);
      setIdeaRetries(0);
    } catch {
      setIdeaRetries((r) => r + 1);
      notifyError('Idea generation failed. Your selections were kept. You can retry.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleGenerateCaptions(idea: ContentIdea) {
    const existing = captions[idea.id] ?? [];
    if (existing.length >= MAX_CAPTIONS_PER_IDEA) {
      notifyError(`You have reached the maximum of ${MAX_CAPTIONS_PER_IDEA} captions for this idea.`);
      return;
    }
    try {
      const added = await engine.generateCaptions(idea, existing);
      setCaptions((prev) => ({ ...prev, [idea.id]: [...existing, ...added] }));
    } catch {
      notifyError('Caption generation failed. Existing captions were kept. You can retry.');
    }
  }

  function editCaption(ideaId: string, captionId: string, text: string) {
    setCaptions((prev) => ({
      ...prev,
      [ideaId]: (prev[ideaId] ?? []).map((c) =>
        c.id === captionId ? { ...c, text, edited: true } : c,
      ),
    }));
  }

  async function handleSave(idea: ContentIdea, caption: CaptionSuggestion | null) {
    if (caption) {
      const check = validateCaption(caption.text);
      if (!check.valid) {
        notifyError(check.message);
        return;
      }
    }
    try {
      await posts.save(idea, caption);
      notifySuccess('Saved to your post ideas.');
    } catch {
      notifyError('That idea could not be saved. Please try again.');
    }
  }

  return (
    <section className={styles.view} aria-labelledby="create-heading">
      <h1 id="create-heading">Create content</h1>

      <SelectionCard
        heading="1. Business type"
        options={BUSINESS_TYPES}
        selected={businessType}
        onSelect={chooseBusiness}
        onCustom={(label) => chooseBusiness({ id: newId(), label, isCustom: true })}
        customLabel="business type"
      />

      <SelectionCard
        heading="2. Target audience"
        options={TARGET_AUDIENCES}
        selected={targetAudience}
        onSelect={chooseAudience}
        onCustom={(label) => chooseAudience({ id: newId(), label, isCustom: true })}
        customLabel="target audience"
      />

      <div className={styles.card}>
        <h2>3. Content goal (optional)</h2>
        <div className={styles.optionGrid}>
          <button
            type="button"
            className={`${styles.option} ${contentGoal === null ? styles.optionSelected : ''}`}
            aria-pressed={contentGoal === null}
            onClick={() => chooseGoal(null)}
          >
            No specific goal
          </button>
          {CONTENT_GOALS.map((g) => (
            <button
              key={g.id}
              type="button"
              className={`${styles.option} ${contentGoal?.id === g.id ? styles.optionSelected : ''}`}
              aria-pressed={contentGoal?.id === g.id}
              onClick={() => chooseGoal(g)}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.row}>
          <Button onClick={handleGenerate} disabled={generating || !canGenerate.ok}>
            {generating ? 'Generating…' : ideas.length ? 'Generate more ideas' : 'Generate ideas'}
          </Button>
          {!canGenerate.ok && (
            <span className={styles.muted}>Pick a business type and audience to start.</span>
          )}
        </div>
      </div>

      {ideas.length > 0 && (
        <div className={styles.card}>
          <h2>Content ideas</h2>
          <ul className={styles.list}>
            {ideas.map((idea) => {
              const caps = captions[idea.id] ?? [];
              return (
                <li key={idea.id} className={styles.card}>
                  <h3>{idea.title}</h3>
                  <p>{idea.description}</p>
                  <div className={styles.row}>
                    <Button variant="secondary" onClick={() => handleGenerateCaptions(idea)}>
                      {caps.length ? 'More captions' : 'Suggest captions'}
                    </Button>
                    <Button onClick={() => handleSave(idea, caps[0] ?? null)}>Save idea</Button>
                  </div>
                  {caps.length > 0 && (
                    <ul className={styles.list}>
                      {caps.map((c) => (
                        <li key={c.id} className={styles.card}>
                          <label className={styles.sr} htmlFor={`cap-${c.id}`}>
                            Caption text
                          </label>
                          <textarea
                            id={`cap-${c.id}`}
                            className={styles.textarea}
                            value={c.text}
                            maxLength={2200}
                            onChange={(e) => editCaption(idea.id, c.id, e.target.value)}
                          />
                          <div className={styles.row}>
                            <span className={styles.muted}>
                              {c.text.length}/2200 {c.edited ? '· edited' : ''}
                            </span>
                            <Button variant="secondary" onClick={() => handleSave(idea, c)}>
                              Save with this caption
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

interface SelectableOption {
  id: string;
  label: string;
}

function SelectionCard<T extends SelectableOption>({
  heading,
  options,
  selected,
  onSelect,
  onCustom,
  customLabel,
}: {
  heading: string;
  options: T[];
  selected: SelectableOption | null;
  onSelect: (value: T) => void;
  onCustom: (label: string) => void;
  customLabel: string;
}) {
  const [custom, setCustom] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submitCustom() {
    const check = validateCustomText(custom);
    if (!check.valid) {
      setError(check.message);
      return;
    }
    setError(null);
    onCustom(custom.trim());
    setCustom('');
  }

  return (
    <div className={styles.card}>
      <h2>{heading}</h2>
      <div className={styles.optionGrid}>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            className={`${styles.option} ${selected?.id === o.id ? styles.optionSelected : ''}`}
            aria-pressed={selected?.id === o.id}
            onClick={() => onSelect(o)}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div className={styles.row}>
        <label className={styles.sr} htmlFor={`custom-${customLabel}`}>
          Custom {customLabel}
        </label>
        <input
          id={`custom-${customLabel}`}
          className={styles.input}
          style={{ maxWidth: 260 }}
          placeholder={`Or enter a custom ${customLabel}`}
          value={custom}
          maxLength={120}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submitCustom();
            }
          }}
        />
        <Button variant="secondary" onClick={submitCustom}>
          Use custom
        </Button>
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {selected && (
        <p className={styles.muted}>
          Selected: <strong>{selected.label}</strong>
        </p>
      )}
    </div>
  );
}
