import React from 'react'
import { RichText } from '@payloadcms/richtext-lexical/react'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'

import type { CaseStudy } from '@/payload-types'

/**
 * Renders a Case Study Lexical rich-text field (intro / challenge / solution /
 * results) as long-form reader copy, styled to match the settled blog-post reader
 * shell (design/site/pages.jsx `BlogPostPage`): body paragraphs at 17px / 1.7 on
 * `--c-ink`, headings as the design's visual `.h3` / `.h4`, comfortable list spacing.
 *
 * Local to this route on purpose. The parallel blog lane needs the same treatment
 * and would collide on a shared component file; folding the two into one shared
 * RichText wrapper is a welcome later refactor (mirrors the issue #1 revalidation
 * note). No invented values — sizes/spacing come from the design source, colors
 * from design-system tokens.
 */

// The four body fields share this generated shape. It is the structural equivalent
// of Lexical's `SerializedEditorState` (the generated type is looser — `type: any`
// children, an index signature), so one documented cast at the boundary is honest.
type CaseStudyRichText = NonNullable<CaseStudy['intro']>

export function RichTextBody({ data }: { data: CaseStudyRichText }) {
  return (
    <RichText
      data={data as unknown as SerializedEditorState}
      disableContainer
      converters={({ defaultConverters }) => ({
        ...defaultConverters,
        paragraph: ({ node, nodesToJSX }) => {
          const children = nodesToJSX({ nodes: node.children })
          if (!children?.length) return null
          return (
            <p style={{ fontSize: 17, lineHeight: 1.7, color: 'var(--c-ink)', margin: '0 0 24px' }}>
              {children}
            </p>
          )
        },
        heading: ({ node, nodesToJSX }) => {
          const children = nodesToJSX({ nodes: node.children })
          // Never emit an <h1> from body copy — the page's single H1 is the story
          // title. Body headings sit under a section's <h2>, so keeping the author's
          // relative level (clamped to h2+) never skips a heading level.
          const level = node.tag === 'h1' ? 2 : Number(node.tag.slice(1))
          const Tag = `h${level}` as 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
          const visual = level <= 2 ? 'h3' : 'h4'
          return (
            <Tag className={visual} style={{ margin: '40px 0 16px' }}>
              {children}
            </Tag>
          )
        },
        list: ({ node, nodesToJSX }) => {
          const children = nodesToJSX({ nodes: node.children })
          const Tag = node.tag
          return (
            <Tag
              style={{
                fontSize: 17,
                lineHeight: 1.7,
                color: 'var(--c-ink)',
                margin: '0 0 24px',
                paddingLeft: 24,
              }}
            >
              {children}
            </Tag>
          )
        },
      })}
    />
  )
}
