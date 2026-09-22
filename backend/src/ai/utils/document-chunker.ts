export interface GeneratedChunk {
  chunkIndex: number;
  content: string;
  heading?: string;
  pageNumber?: number;
  charCount: number;
}

/**
 * Intelligent Document Chunker for Legal & Regulatory Documents.
 * Splits Markdown text by legal hierarchy (Điều, Chương, Heading) and size limits.
 */
export function chunkMarkdownDocument(
  markdown: string,
  options: {
    maxChunkSize?: number;
    chunkOverlap?: number;
  } = {},
): GeneratedChunk[] {
  if (!markdown || !markdown.trim()) {
    return [];
  }

  const maxChunkSize = options.maxChunkSize || 1500;
  const chunkOverlap = options.chunkOverlap || 150;

  const lines = markdown.split(/\r?\n/);
  const sections: Array<{
    heading: string;
    lines: string[];
    pageNumber?: number;
  }> = [];

  let currentHeading = 'Tổng quan văn bản';
  let currentLines: string[] = [];
  let currentPage = 1;

  // Regex patterns for Vietnamese legal and Markdown headings
  const headingRegex =
    /^(#{1,4}\s+|(?:\*{1,2})?(?:Điều\s+\d+|Chương\s+[IVXLCDM\d]+|Phần\s+[IVXLCDM\d]+|Mục\s+\d+)[.:\s\-–—])/i;
  const pageMarkerRegex = /(?:<!--\s*page\s*(\d+)\s*-->|\f)/i;

  for (const line of lines) {
    const trimmed = line.trim();

    // Check for page breaks
    const pageMatch = trimmed.match(pageMarkerRegex);
    if (pageMatch) {
      if (pageMatch[1]) {
        currentPage = parseInt(pageMatch[1], 10);
      } else {
        currentPage++;
      }
    }

    // Check for new section/article heading
    if (headingRegex.test(trimmed)) {
      if (currentLines.length > 0) {
        sections.push({
          heading: currentHeading,
          lines: [...currentLines],
          pageNumber: currentPage,
        });
        currentLines = [];
      }
      currentHeading = trimmed
        .replace(/^[#*\s]+/, '')
        .replace(/[*]+$/, '')
        .trim();
    }

    currentLines.push(line);
  }

  // Push remaining lines
  if (currentLines.length > 0) {
    sections.push({
      heading: currentHeading,
      lines: [...currentLines],
      pageNumber: currentPage,
    });
  }

  // Now create size-bounded chunks from sections
  const chunks: GeneratedChunk[] = [];
  let chunkIndex = 0;

  for (const section of sections) {
    const sectionText = section.lines.join('\n').trim();
    if (!sectionText) continue;

    if (sectionText.length <= maxChunkSize) {
      chunks.push({
        chunkIndex: chunkIndex++,
        content: sectionText,
        heading: section.heading,
        pageNumber: section.pageNumber,
        charCount: sectionText.length,
      });
    } else {
      // Split large section by paragraphs
      const paragraphs = sectionText.split(/\n\s*\n/);
      let buffer = '';

      for (const para of paragraphs) {
        const trimmedPara = para.trim();
        if (!trimmedPara) continue;

        if (buffer.length + trimmedPara.length + 2 <= maxChunkSize) {
          buffer = buffer ? `${buffer}\n\n${trimmedPara}` : trimmedPara;
        } else {
          if (buffer) {
            chunks.push({
              chunkIndex: chunkIndex++,
              content: buffer,
              heading: section.heading,
              pageNumber: section.pageNumber,
              charCount: buffer.length,
            });
            // Overlap: keep tail of previous buffer
            const overlapText = buffer.slice(-chunkOverlap);
            buffer = `[${section.heading} - tiếp]\n...${overlapText}\n\n${trimmedPara}`;
          } else {
            // Single paragraph exceeds maxChunkSize: slice directly
            let start = 0;
            while (start < trimmedPara.length) {
              const slice = trimmedPara.slice(start, start + maxChunkSize);
              chunks.push({
                chunkIndex: chunkIndex++,
                content: slice,
                heading: section.heading,
                pageNumber: section.pageNumber,
                charCount: slice.length,
              });
              start += maxChunkSize - chunkOverlap;
            }
            buffer = '';
          }
        }
      }

      if (buffer.trim()) {
        chunks.push({
          chunkIndex: chunkIndex++,
          content: buffer.trim(),
          heading: section.heading,
          pageNumber: section.pageNumber,
          charCount: buffer.trim().length,
        });
      }
    }
  }

  return chunks;
}
