# 【WorkInProgress】(開発中) markdownを指定のテンプレートでhtmlにする

## 1. 環境回り

tsで書く都合で、highlight.jsだけではrequire('highlight.js')時にエラーが出る。@typesをinstallすると、ts用のコンポーネントが入ってエラーが解消する。

```bash
npm install @types/highlight.js
```

## 2. 作りたい機能

- [x] 通常のprintHTMLで出力される、`<body></body>`内部を取得
- [x] rootの `template.html` をもとに テンプレートエンジン を使って markdown の内容を入れる
- [x] `file://....` を削除する
- [ ] message-box
- [ ] code-block
- [ ] file-name code block
- [ ] highlight.js

`/template/template.html` を下記のように配置する

```html
<!DOCTYPE html>
<html>

<head>
    <meta charset="UTF-8">
    <link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/default.min.css" />
    <link href="/code-block.css" rel="stylesheet"/>
    <title>{{{ title }}}</title>
</head>

<body class="vscode-body">
    {{{ contents }}}
    <script src="//cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/highlight.min.js"></script>
<script src="//cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/highlight.min.js"></script>
<script src="/code-block.js"></script>
</body>

</html>
```

`/code-block.css`

```css
#wrapper {
    padding: 5%;
    margin: 0 auto;
}

/* CSS Simple Pre Code */
pre.codeblock {
    background: #333;
    white-space: pre;
    word-wrap: break-word;
    overflow: auto;
    margin: 20px 25px;
    border-radius: 4px;
    position: relative;
}

pre.codeblock div.name {
    display: inline-flex;
    color: #1d1d1de6;
    background-color: #a7a7a7;
    position: absolute;
    font-weight: bold;
    font-size: 14px;
    margin: 0;
    padding-left: 8px;
    padding-right: 8px;
    padding-top: 2px;
    padding-bottom: 2px;
    line-height: 16px;
}

pre.codeblock div.language {
    font-family: sans-serif;
    font-weight: bold;
    font-size: 13px;
    color: #ddd;
    position: absolute;
    left: 1px;
    margin-top: 30px;
    vertical-align: middle;
    text-align: center;
    width: 60px;
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    pointer-events: none;
}

pre.codeblock code {
    font-family: "Inconsolata", "Monaco", "Consolas", "Andale Mono", "Bitstream Vera Sans Mono", "Courier New", Courier, monospace;
    display: block;
    margin-left: 60px;
    margin-top: 16px;
    padding: 4px;
    border-left: 1px solid #555;
    overflow-x: auto;
    font-size: 13px;
    line-height: 19px;
    color: #ddd;
}

pre.codeblock::after {
    content: "ダブルクリックで全選択";
    padding: 0;
    width: auto;
    height: auto;
    position: absolute;
    right: 18px;
    top: 14px;
    font-size: 12px;
    color: #ddd;
    line-height: 20px;
    overflow: hidden;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    transition: all 1.2s ease;
}

pre.codeblock:hover::after {
    opacity: 0;
    visibility: visible;
}
```

`code-block.js`

```js
var pres = document.querySelectorAll('pre.codeblock code');
console.log(pres);
for (var i = 0; i < pres.length; i++) {
  pres[i].addEventListener("dblclick", function () {
    var selection = getSelection();
    var range = document.createRange();
    range.selectNodeContents(this);
    selection.removeAllRanges();
    selection.addRange(range);
  }, false);
}
```


### 2.1. テンプレートエンジンについて

[popularなので](https://npmtrends.com/jade-vs-mustache-vs-squirrelly) mustache を使う

### formatterについて

[prettier](https://prettier.io/docs/en/install.html)を使う
