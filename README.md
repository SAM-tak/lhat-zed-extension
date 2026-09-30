# L^ Language Support for Zed

L^（エルハット）の Zed 拡張。VSCode 版の言語設定を移植し、既存の
`lhatls` と `lhat` を利用する。ビジュアルエディターは対象外。

## 対応機能

| 機能 | 実装 |
| --- | --- |
| `.lh` / `.lton` の認識 | L^ / LTON を別言語として登録 |
| シンタックスハイライト | Tree-sitter。ハット識別子、日本語、数値、文字列補間、入れ子コメントなど |
| 括弧対応・自動閉じ・インデント | Tree-sitter と言語設定 |
| 行・ブロックコメント | `#` / `#[ ... ]#` |
| 診断・補完・ホバー・定義移動 | `lhatls` の標準 LSP 機能 |
| 参照検索・名前変更・コードアクション | `lhatls` の標準 LSP 機能 |
| セマンティックハイライト | Zed の `semantic_tokens` 設定で有効化 |
| デバッグ起動 | `lhat --dap=PORT` への TCP 接続。停止・ステップ・変数表示などは Zed の DAP UI |

Tree-sitter 文法は**字句と括弧構造を扱うエディター用文法**。
完全な L^ 構文検証・型検査、LTON 固有の制限は `lhatls` に任せる。
構造化された宣言・関数の構文木と Zed 用 `outline.scm` は未実装。
VSCode 固有の「Copy Signature」「Toggle Disabled Code」コマンドも未移植。

## 必要なもの

- 現行の Zed（拡張 API 0.7 対応。最低 0.205 系）
- [rustup](https://rustup.rs/)。プロジェクトは Rust 1.93.1 / `wasm32-wasip2` を使用
- Git
- Node.js 22 以降（文法の生成・検証と開発用パッケージの準備）
- L^ 本体からビルド・インストールした `lhatls`。デバッグには `lhat` も必要

サーバーとランタイムの自動ダウンロード・同梱は行わない。
`PATH` に配置するか、以下の設定で実行ファイルを指定する。
Zed は文法の WASM ビルドに必要な wasi-sdk を自動取得する。

## ローカル導入

この段階では Marketplace 公開前。**リポジトリ直下をそのまま Install Dev
Extension に指定せず、`dist/dev` を生成して使う。**

```sh
npm ci
npm run generate
npm test
npm run check:queries
cargo build --locked --target wasm32-wasip2
```

Zed は開発拡張でも文法を Git から取得するため、生成済みの
`tree-sitter-lhat/src/parser.c`・`grammar.json`・`node-types.json`・ヘッダーと
`scanner.c` を含むコミットが必要。新しい作業ディレクトリなら、まず Git
リポジトリを作成し、内容を確認して初回コミットを作る。

コミット後に実行:

```sh
npm run prepare:dev
```

このコマンドはコミットを作らず、現在の `HEAD` とローカル `file://` URL を
使う開発用マニフェストを `dist/dev/extension.toml` に生成する。
未コミットの文法変更がある場合は、古い文法を使わないようエラーにする。
また、ホームディレクトリで Rust の WASI ターゲット確認を行う。
Zed は拡張ディレクトリへ移動する前にも `rustc` を呼ぶため、プロジェクト内の
`rust-toolchain.toml` だけでなく、プロジェクト外で選択される Rust も対応している必要がある。

1. Zed のコマンドパレットで `zed: install dev extension` を実行。
2. このプロジェクトの **`dist/dev`** を選択。
3. 下記の LSP 設定を入れ、`examples/hello.lh` を開く。
4. `square(4)` 上でホバー・定義移動を確認する。LTON は `examples/settings.lton`。

Rust・言語設定を変更したら `npm run prepare:dev` を再実行し、Zed で開発拡張を
再ビルドする。文法を変更した場合は、先に生成・テスト・コミットも行う。

公開時は `extension.toml` のリポジトリ URL を実際の公開先に合わせ、
`grammars.lhat.rev` を生成済みパーサーを含むコミット SHA に固定する。
現在の `main` は公開前の仮指定。

### `compiling Rust extension` でインストールに失敗する場合

Zed の `zed: open log` で詳細を確認する。
`unknown print request 'target-libdir'` があれば、Zed の事前チェックで古い Rust が
選ばれている。プロジェクト内で `cargo build` が成功しても、この確認は別環境になる。

本プロジェクトのバージョンを既定にする場合:

```sh
rustup toolchain install 1.93.1 --profile minimal --target wasm32-wasip2
rustup default 1.93.1
npm run prepare:dev
```

`rustup default` はユーザー全体の既定を変更する。個別プロジェクトの
`rust-toolchain.toml` や rustup override による指定は引き続き優先される。
準備が通ったら、Zed で再び `dist/dev` を選択する。

## LSP 設定

Zed の `settings.json` またはプロジェクトの `.zed/settings.json`:

```json
{
  "lsp": {
    "lhatls": {
      "binary": {
        "path": "C:/path/to/lhatls.exe",
        "arguments": []
      },
      "initialization_options": {
        "messages": "C:/path/to/lhat/messages"
      }
    }
  },
  "languages": {
    "L^": { "semantic_tokens": "combined" },
    "LTON": { "semantic_tokens": "combined" }
  }
}
```

- `binary.path` は実行ファイルそのもののパス。`PATH` で見つかるなら省略可能。
- `binary.arguments` と `binary.env` も渡せる。標準起動の引数は空。
- `initialization_options` はそのままサーバーへ渡す。
- `messages` は任意。VSCode 版の `lhat.messagesPath` に相当する。
  メッセージの言語はクライアントの LSP `locale` に依存するため、
  この設定だけで日本語になるとは限らない。
- VSCode の `lhat.serverPath` などを Zed が直接読むことはない。

言語サーバーの再起動は Zed 標準の `editor: restart language server` を使用。

### ハイライトが表示されない場合

グローバル設定が `"semantic_tokens": "full"` の場合、Tree-sitter のハイライトは
使われない。上記のように **L^ と LTON に `"combined"` を設定**すると、文法による
色分けと LSP のセマンティックハイライトを併用できる。
`lhatls was not found` がログに出る場合は `lsp.lhatls.binary.path` も指定する。
設定後も反映されなければ `.lh` ファイルを開き直し、必要に応じて言語サーバーを再起動する。

### ハット `^` を控えめに表示する

`if^` の `if` と `^`、`self^^` の `self` と `^^` を別々にハイライトする。
ハット専用キャプチャは `comment.lhat_hat`。未設定のテーマではコメント色に
フォールバックするが、コードをコメント扱いにする設定ではない。
文字列・コメント・バッククォート名の中の `^` は、それぞれ本来の色のまま。

VSCode 版と同じ半透明グレーにするには、Zed のユーザー設定に以下を追加する。
One Dark／One Light ではコメント色とほぼ同じ明るさにしている
（`#5d636f`／`a2a3a7`）。さらに薄くするにはアルファ値を `#rrggbbaa` の形で下げる:

```json
{
  "theme_overrides": {
    "One Dark": {
      "syntax": {
        "comment.lhat_hat": { "color": "#5d636f", "font_style": "normal" }
      }
    },
    "One Light": {
      "syntax": {
        "comment.lhat_hat": { "color": "#a2a3a7", "font_style": "normal" }
      }
    }
  }
}
```

別のテーマを使う場合は、そのテーマ名に置き換える。
セマンティックハイライトは引き続き `combined` を使用する。

## デバッグ

プロジェクトに `.zed/debug.json` を作成する:

```json
[
  {
    "label": "Run this L^ file",
    "adapter": "Lhat",
    "request": "launch",
    "program": "$ZED_FILE",
    "cwd": "$ZED_WORKTREE_ROOT",
    "runtimePath": "C:/path/to/lhat.exe",
    "args": [],
    "stopOnEntry": true,
    "relaxed": false
  }
]
```

`runtimePath` は省略すると `PATH` から `lhat` を探す。`env` で環境変数を追加できる。
引数は `--dap=PORT`、任意の `--relaxed`、プログラム、`args` の順に渡す。
ポートは Zed が選び、接続先は L^ ランタイムに合わせて loopback に固定する。
New Process UI からの起動設定変換にも対応。既存プロセスへの attach は非対応。

VSCode 版にある stdout/stderr → DAP output イベントのプロキシは含まないため、
プログラム標準出力の Debug Console 表示は VSCode 版と同等ではない。

## 検証

```sh
npm test
npm run check:queries
cargo fmt --check
cargo clippy --locked --target wasm32-wasip2 -- -D warnings
cargo build --locked --release --target wasm32-wasip2

# 実サーバー／ランタイムとの通信を確認する（実行ファイルのパスは環境に合わせる）
npm run smoke:lsp -- ../lhat/build/release/lhatls.exe
npm run smoke:dap -- ../lhat/build/release/lhat.exe
```

スモークテストの実行ファイルは絶対パス推奨。Windows 以外では `.exe` を外す。
`LHAT_SMOKE_TRACE=1` で送受信 JSON を出力できる。

検証対象:

- Tree-sitter コーパス: ハット・Unicode・スコープ指定子・数値キー・文字列・補間・コメント・LTON
- 全 Zed クエリーのコンパイルと L^ / LTON 間の一致
- LSP: 診断・セマンティックトークン・ホバー・定義・参照・名前変更・全文同期
- DAP: 初期化・起動・entry 停止・スレッド・スタック・スコープ・切断

これらは Zed UI の E2E テストではない。実機での開発拡張インストールと
キー操作・表示確認は別途必要。

### 未コミットの文法を開発拡張でプレビューする

`dist/dev` を一度インストールした環境では、`npm run preview:grammar` で
作業ツリーの文法を生成・テストし、Zed と同じ wasi-sdk オプションでコンパイルして
`dist/dev` の文法 WASM と言語設定を更新できる。Zed の拡張をリロードして確認する。
Windows では Zed が取得した wasi-sdk を検出する。それ以外では `WASI_SDK_PATH` を指定する。

これはローカルのプレビュー。通常のインストールはマニフェストの Git リビジョンを
使うため、クリーンな再インストール前に文法をコミットして `npm run prepare:dev` を実行する。

## 構成

```text
extension.toml             拡張・LSP・DAP・文法の登録
src/                       Rust/WASM の起動処理
languages/lhat/             L^ の設定・Tree-sitter クエリー
languages/lton/             LTON の設定・同一クエリー
tree-sitter-lhat/           文法・外部スキャナー・生成済みパーサー・テスト
debug_adapter_schemas/     デバッグ設定スキーマ
scripts/                   開発用パッケージ生成・検証
examples/                  Zed での確認用ファイル
```

TextMate 文法から Tree-sitter への単純な形式変換はできないため、
`lhat-vscode-extension` の言語設定と `lhat/DesignDocuments/01-lexical-structure.md`
を参照して新しい文法を実装した。クエリーは Zed が言語ごとに読み込むため
L^ / LTON の両方に置き、`check:queries` で差分を検知する。

License: Apache-2.0（VSCode 版と同じ）。
