export function exportMarkdown(review, prNumber) {
    const blob = new Blob([review], {
        type: "text/markdown;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = `review-pr-${prNumber}.md`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}