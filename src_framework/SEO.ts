namespace iignition {
    export interface SEOMetadata {
        title?: string;
        description?: string;
        keywords?: string;
    }

    export class SEO {
        static update(metadata: SEOMetadata): void {
            if (metadata.title !== undefined) {
                this.updateTitle(metadata.title);
            }

            if (metadata.description !== undefined) {
                this.updateMetaTag('description', metadata.description);
            }

            if (metadata.keywords !== undefined) {
                this.updateMetaTag('keywords', metadata.keywords);
            }
        }

        private static updateTitle(title: string): void {
            const titleElement = document.querySelector('title');
            if (titleElement) {
                titleElement.textContent = title;
            } else {
                const newTitle = document.createElement('title');
                newTitle.textContent = title;
                document.head.appendChild(newTitle);
            }
        }

        private static updateMetaTag(name: string, content: string): void {
            let metaElement = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
            
            if (metaElement) {
                metaElement.content = content;
            } else {
                metaElement = document.createElement('meta');
                metaElement.name = name;
                metaElement.content = content;
                document.head.appendChild(metaElement);
            }
        }
    }
} 