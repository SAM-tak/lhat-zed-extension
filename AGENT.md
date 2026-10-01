# Zed Language support for The Programming Language L^

## Genshijin

@./skills/genshijin/SKILL.md

## 関連プロジェクト

### tree-sitter-lhat

L^ / LTON の Tree-sitter 文法・生成済みパーサー・文法テスト。

@../tree-sitter-lhat/

文法はこの別リポジトリで管理する。この拡張内に文法や生成済み C ソースを複製しない。
Zed 固有の設定・クエリーは `languages/` に置き、`extension.toml` で文法のコミットを参照する。
文法チェックアウトの場所は `LHAT_GRAMMAR_PATH` で変更可能。

### lhat

プログラミング言語 L^ 本体

@../lhat/

### lhat-svg-tools

L^ソースをシンタックスハイライト済みのSVGに変換するツール

@../lhat-svg-tools/

### lhat-vscode-extension

L^ の VSCode 拡張（言語クライアント・グラフ表示・デバッグクライアント）

@../lhat-vscode-extension/

### lhat-gdextension

L^ のGodotエンジン向けバインディング

@../lhat-gdextension/

### lhat-love

Love2D の L^ 使用版プロジェクト

@../lhat-love/
