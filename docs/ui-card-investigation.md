# カードUI不具合の調査記録

## 気づきカード

前回の実装では `InsightsFeed.tsx` の操作領域が次の1つの可変行でした。

```tsx
<div data-insight-actions className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
  <Button>いいね</Button>
  <Button>コメント</Button>
  {canDelete && <AlertDialog>...</AlertDialog>}
</div>
```

`flex-wrap` がいいね・コメント・削除の全要素へ一括適用されているため、カード幅や削除ボタンの有無によってコメントが次の行へ送られます。テストは2ボタンが同じ親要素内にあることだけを検証しており、同じ行に留まることを検証していませんでした。

修正では、いいね・コメントを独立した `inline-flex flex-nowrap shrink-0` グループへまとめ、削除操作とは別のレイアウト単位にします。これによりカード幅が狭い場合も、いいねとコメントの組だけは折り返されません。

## 改善事例カード

前回の実装では外側カードが `h-full`、本文が `h-[21rem]`、制作物URL領域が `min-h-14` でした。

```tsx
<article className="... h-full ...">
  <div data-improvement-card-body className="flex h-[21rem] flex-col p-5">
    ...
    <div data-improvement-card-actions className="mt-4 flex min-h-14 ...">...</div>
    <div data-improvement-card-author className="mt-auto ...">...</div>
  </div>
</article>
```

`h-full` はグリッド行に明示高がないためカードの絶対高を固定しません。また `min-h-14` は内容増加時の伸長を許すため、最大表示時サイズへの固定にはなっていませんでした。

修正では、本文と制作物領域をモバイル・PCそれぞれの明示高に固定し、投稿者行を本文最下部へ配置します。タイトルと説明の行数も固定して、URL有無による投稿者位置の差をなくします。

## 検証方針

DOMクラスの存在確認だけでなく、開発専用のカード確認画面で実コンポーネントと同じレイアウト部品を表示し、PC・モバイルのスクリーンショットとコメント開閉操作で確認します。本番公開後の確認のみユーザー側へ引き継ぎます。
