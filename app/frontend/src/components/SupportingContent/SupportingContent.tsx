import DOMPurify from "dompurify";

import { DataPoints } from "../../api";
import { parseSupportingContentItem } from "./SupportingContentParser";

import styles from "./SupportingContent.module.css";
import { DefaultButton } from "@fluentui/react";

interface Props {
    supportingContent?: DataPoints;
}

export const SupportingContent = ({ supportingContent }: Props) => {
    const textItems = supportingContent?.text ?? [];
    const imageItems = supportingContent?.images ?? [];
    const webItems = supportingContent?.external_results_metadata ?? [];

    // Determine if there is any supporting content to download
    const hasContent = textItems.length > 0 || imageItems.length > 0 || webItems.length > 0;

    // Creates and downloads a text file containing all supporting content.
    const handleDownload = () => {
        const lines: string[] = [];

        // Add text items
        textItems.forEach((c, index) => {
            const { title, content } = parseSupportingContentItem(c);
            // Strip HTML tags from content
            const textContent = content.replace(/<[^>]+>/g, "");
            lines.push(`--- Text Item ${index + 1} ---`);
            if (title) lines.push(`Title: ${title}`);
            lines.push(textContent);
            lines.push("");
        });

        // Add image items
        imageItems.forEach((img, index) => {
            lines.push(`--- Image ${index + 1} ---`);
            lines.push(img);
            lines.push("");
        });

        // Add web items
        webItems.forEach((item, index) => {
            lines.push(`--- Web Result ${index + 1} ---`);
            if (item.title) lines.push(`Title: ${item.title}`);
            if (item.snippet) {
                // Strip HTML tags from snippet
                const snippetText = DOMPurify.sanitize(item.snippet).replace(/<[^>]+>/g, "");
                lines.push(`Snippet: ${snippetText}`);
            }
            if (item.url) lines.push(`URL: ${item.url}`);
            lines.push("");
        });

        const blob = new Blob([lines.join("\n")], { type: "text/plain" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "supporting_content.txt";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(url);
    };

    return (
        <ul className={styles.supportingContentNavList}>
            {/* Button to download the supporting content as a text file */}
            <li>
                <DefaultButton onClick={handleDownload} disabled={!hasContent}>
                    Download Supporting Content
                </DefaultButton>
            </li>

            {textItems.map((c, ind) => {
                const parsed = parseSupportingContentItem(c);
                return (
                    <li className={styles.supportingContentItem} key={`supporting-content-text-${ind}`}>
                        <h4 className={styles.supportingContentItemHeader}>{parsed.title}</h4>
                        <p className={styles.supportingContentItemText} dangerouslySetInnerHTML={{ __html: parsed.content }} />
                    </li>
                );
            })}

            {imageItems.map((img, ind) => {
                return (
                    <li className={styles.supportingContentItem} key={`supporting-content-image-${ind}`}>
                        <img className={styles.supportingContentItemImage} src={img} alt="Supporting content" />
                    </li>
                );
            })}

            {webItems.map((item, ind) => (
                <li className={styles.supportingContentItem} key={`supporting-content-web-${item.id ?? ind}`}>
                    {item.url ? (
                        <h4 className={styles.supportingContentItemHeader}>
                            <a href={item.url} target="_blank" rel="noreferrer">
                                {item.title ?? item.url}
                            </a>
                        </h4>
                    ) : (
                        <h4 className={styles.supportingContentItemHeader}>{item.title ?? "Web result"}</h4>
                    )}
                    {item.snippet && (
                        <p
                            className={styles.supportingContentItemText}
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item.snippet) }}
                        />
                    )}
                </li>
            ))}
        </ul>
    );
};
