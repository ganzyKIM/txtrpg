import { useEffect, useState } from 'react';
import {
  adjustCredits,
  getConfig,
  listLedger,
  listUsers,
  setConfig,
  topupCredits,
  type AdminUser,
  type ConfigRow,
  type LedgerEntry,
} from './adminApi';

interface Props {
  onClose: () => void;
}

type Tab = 'users' | 'config';

export default function AdminPanel({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>('users');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [amount, setAmount] = useState('');
  const [config, setConfigRows] = useState<ConfigRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function refreshUsers() {
    setLoading(true);
    setError(null);
    try {
      setUsers(await listUsers());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function refreshConfig() {
    setError(null);
    try {
      setConfigRows(await getConfig());
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    void refreshUsers();
  }, []);

  async function selectUser(u: AdminUser) {
    setSelected(u);
    setLedger([]);
    try {
      setLedger(await listLedger(u.id));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function doTopup(sign: 1 | -1) {
    if (!selected) return;
    const n = Math.trunc(Number(amount));
    if (!Number.isFinite(n) || n <= 0) {
      setError('0보다 큰 금액을 입력하세요.');
      return;
    }
    try {
      const delta = sign * n;
      const balance =
        sign > 0 ? await topupCredits(selected.id, delta) : await adjustCredits(selected.id, delta);
      setAmount('');
      setSelected({ ...selected, credits: balance });
      setUsers((us) => us.map((u) => (u.id === selected.id ? { ...u, credits: balance } : u)));
      setLedger(await listLedger(selected.id));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function saveConfig(key: string, raw: string) {
    setError(null);
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      setError(`'${key}' 값이 올바른 JSON이 아닙니다.`);
      return;
    }
    try {
      await setConfig(key, value);
      await refreshConfig();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="admin-overlay">
      <div className="admin-panel">
        <div className="admin-header">
          <h2>관리자 백오피스</h2>
          <div className="admin-tabs">
            <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>
              유저
            </button>
            <button
              className={tab === 'config' ? 'active' : ''}
              onClick={() => {
                setTab('config');
                void refreshConfig();
              }}
            >
              설정
            </button>
          </div>
          <button className="admin-close" onClick={onClose}>
            닫기 ✕
          </button>
        </div>

        {error && <p className="admin-error">{error}</p>}

        {tab === 'users' && (
          <div className="admin-body">
            <div className="admin-userlist">
              {loading ? (
                <p>불러오는 중...</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>유저</th>
                      <th>크레딧</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr
                        key={u.id}
                        className={selected?.id === u.id ? 'sel' : ''}
                        onClick={() => void selectUser(u)}
                      >
                        <td>
                          {u.display_name ?? u.email ?? u.id.slice(0, 8)}
                          {u.is_admin && <span className="admin-badge">관리자</span>}
                        </td>
                        <td className="num">{u.credits.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="admin-detail">
              {selected ? (
                <>
                  <h3>{selected.display_name ?? selected.email}</h3>
                  <p className="muted">{selected.email}</p>
                  <p>
                    현재 잔액: <b>{selected.credits.toLocaleString()}</b> 크레딧
                  </p>
                  <div className="topup-row">
                    <input
                      type="number"
                      placeholder="금액"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                    <button className="primary" onClick={() => void doTopup(1)}>
                      충전 +
                    </button>
                    <button className="danger" onClick={() => void doTopup(-1)}>
                      차감 −
                    </button>
                  </div>

                  <h4>최근 내역</h4>
                  <div className="ledger">
                    {ledger.length === 0 ? (
                      <p className="muted">내역 없음</p>
                    ) : (
                      <table>
                        <tbody>
                          {ledger.map((l) => (
                            <tr key={l.id}>
                              <td className="muted small">
                                {new Date(l.created_at).toLocaleString()}
                              </td>
                              <td>{l.type}</td>
                              <td className={`num ${l.delta < 0 ? 'neg' : 'pos'}`}>
                                {l.delta > 0 ? '+' : ''}
                                {l.delta.toLocaleString()}
                              </td>
                              <td className="num muted">{l.balance_after.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </>
              ) : (
                <p className="muted">왼쪽에서 유저를 선택하세요.</p>
              )}
            </div>
          </div>
        )}

        {tab === 'config' && (
          <div className="admin-config">
            <p className="muted">
              환율(fx), 배수(markup), 모델 단가(models), 이미지 단가(image)를 JSON으로 편집합니다.
            </p>
            {config.map((row) => (
              <ConfigEditor key={row.key} row={row} onSave={saveConfig} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ConfigEditor({
  row,
  onSave,
}: {
  row: ConfigRow;
  onSave: (key: string, raw: string) => void;
}) {
  const [raw, setRaw] = useState(JSON.stringify(row.value, null, 2));
  return (
    <div className="config-row">
      <div className="config-key">{row.key}</div>
      <textarea value={raw} onChange={(e) => setRaw(e.target.value)} rows={raw.split('\n').length} />
      <button onClick={() => onSave(row.key, raw)}>저장</button>
    </div>
  );
}
