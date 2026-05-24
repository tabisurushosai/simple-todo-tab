# 移植ガイド

このプロジェクトは、将来 iOS / Android のアプリシェルへ移植しやすいように、
タスクの純ロジックとプラットフォーム依存処理を分けておく。

## 境界

- `src/core` はタスクの純ロジックとデータ型だけを置く。ここから `chrome.*`、
  DOM API、通信 API、各プラットフォームの保存 API を呼ばない。
  `eslint.config.mjs` の `src/core/**/*.ts` ルールでこの境界を検出する。
- `src/storage/todoStorage.ts` は保存アダプタの契約と保存値の形を定義する。
  既存キーと値形式は互換性を保つ:
  `tasks`, `last_date`, `trial_start_ts`, `is_premium`, `history`, `theme`。
- 保存キーの一覧とキー判定は `TODO_STORAGE_KEYS` / `isTodoStorageKey` を使い、
  プラットフォーム別アダプタ内で独自のキー一覧を重複定義しない。
- 変更通知をアダプタから UI へ渡すときは `filterTodoStorageChanges` で
  Todo 用キーだけに絞り、Chrome やモバイル保存 API 固有の変更オブジェクトを
  UI / core 側へ漏らさない。
- プラットフォーム別の保存実装は契約と同じ階層に置く。Chrome 拡張向けは
  `src/storage/chromeTodoStorage.ts`。iOS / Android 向けも core を変更せず、
  同じ `TodoStorageAdapter` interface を実装する。
- UI は storage 契約と core 関数に依存させる。`chrome.i18n` や
  `chrome.storage` のようなブラウザ拡張 API は、別シェルで差し替えやすいよう
  プラットフォーム端に寄せる。

## iOS / Android シェルで差し替えるもの

- `src/core` はそのまま再利用し、アプリシェルから直接プラットフォーム API を
  渡さない。タスクの作成、正規化、並べ替え、完了切替などは core 関数だけで行う。
- 保存は `TodoStorageAdapter` を実装したモジュールに閉じ込める。モバイル版では
  SQLite、Key-Value Store、ファイル保存などを使ってよいが、アプリ側へ見せる
  キーと JSON 互換の値形式は Chrome 版と同じにする。
- adapter の外へ公開する型は `TodoStorageValues` / `TodoStoragePatch` /
  `TodoStorageChanges` に揃える。ネイティブ保存 API が返す独自のイベント型は、
  adapter 内で `TodoStorageChanges` へ変換してから UI へ通知する。
- UI は起動時に利用する storage アダプタを 1 箇所で選ぶ。画面コンポーネント内に
  `chrome.storage` やモバイル固有の保存 API を直接書かない。
- `subscribe` は別画面・別プロセスから変更通知を受けられる環境では通知を橋渡しし、
  単一画面で不要な場合も同じ関数形の no-op unsubscribe を返す実装にする。

## storage アダプタ追加時のチェックリスト

1. `TodoStorageAdapter` の `get`, `set`, `subscribe` を実装する。
2. 保存キーと JSON 互換の値形式を維持する。
3. `get` は要求されたキーだけを読み、未保存のキーは `undefined` のまま返す。
4. `set` は渡されたキーだけを更新し、既存の保存形式を変換しない。
5. `subscribe` は `TodoStorageChanges` 形式へ変換して通知する。変更元 API が
   余分なキーを返す場合は `filterTodoStorageChanges` で除外する。
6. オフライン前提を変える別判断がない限り、保存は端末ローカルに閉じる。
7. Chrome 版に remote code、外部 CDN / 外部フォント、`eval`、新しい権限を
   追加しない。

## iOS / Android 実装メモ

- ネイティブ保存層は、アプリ起動時に `TodoStorageAdapter` として UI へ注入する。
  UI や core から直接 SQLite、Keychain / Keystore、SharedPreferences などを
  呼ばない。
- 保存値は Chrome 版と同じ JSON 互換オブジェクトに揃える。日付キー
  `last_date` は既存の `YYYY-M-D` 文字列形式を維持し、完了履歴の
  `completed_at` は UNIX epoch milliseconds の number として扱う。
- 複数画面やバックグラウンド同期を導入する場合も、画面側へは
  `subscribe` の変更通知として渡す。同期処理そのものは storage アダプタより外側の
  プラットフォーム層で扱う。

## Chrome 拡張版の注意

Chrome 拡張版は Manifest V3 で、permission は `storage` のみ。
`chrome.storage` を呼ぶ storage モジュールは Chrome 用アダプタだけにする。
