# 移植ガイド

このプロジェクトは、将来 iOS / Android のアプリシェルへ移植しやすいように、
タスクの純ロジックとプラットフォーム依存処理を分けておく。

## 境界

- `src/core` はタスクの純ロジックとデータ型だけを置く。ここから `chrome.*`、
  DOM API、通信 API、各プラットフォームの保存 API を呼ばない。
- `src/storage/todoStorage.ts` は保存アダプタの契約と保存値の形を定義する。
  既存キーと値形式は互換性を保つ:
  `tasks`, `last_date`, `trial_start_ts`, `is_premium`, `history`, `theme`。
- プラットフォーム別の保存実装は契約と同じ階層に置く。Chrome 拡張向けは
  `src/storage/chromeTodoStorage.ts`。iOS / Android 向けも core を変更せず、
  同じ `TodoStorage` interface を実装する。
- UI は storage 契約と core 関数に依存させる。`chrome.i18n` や
  `chrome.storage` のようなブラウザ拡張 API は、別シェルで差し替えやすいよう
  プラットフォーム端に寄せる。

## iOS / Android シェルで差し替えるもの

- `src/core` はそのまま再利用し、アプリシェルから直接プラットフォーム API を
  渡さない。タスクの作成、正規化、並べ替え、完了切替などは core 関数だけで行う。
- 保存は `TodoStorageAdapter` を実装したモジュールに閉じ込める。モバイル版では
  SQLite、Key-Value Store、ファイル保存などを使ってよいが、アプリ側へ見せる
  キーと JSON 互換の値形式は Chrome 版と同じにする。
- UI は起動時に利用する storage アダプタを 1 箇所で選ぶ。画面コンポーネント内に
  `chrome.storage` やモバイル固有の保存 API を直接書かない。
- `subscribe` は別画面・別プロセスから変更通知を受けられる環境では通知を橋渡しし、
  単一画面で不要な場合も同じ関数形の no-op unsubscribe を返す実装にする。

## storage アダプタ追加時のチェックリスト

1. `TodoStorageAdapter` の `get`, `set`, `subscribe` を実装する。
2. 保存キーと JSON 互換の値形式を維持する。
3. オフライン前提を変える別判断がない限り、保存は端末ローカルに閉じる。
4. Chrome 版に remote code、外部 CDN / 外部フォント、`eval`、新しい権限を
   追加しない。

## Chrome 拡張版の注意

Chrome 拡張版は Manifest V3 で、permission は `storage` のみ。
`chrome.storage` を呼ぶ storage モジュールは Chrome 用アダプタだけにする。
