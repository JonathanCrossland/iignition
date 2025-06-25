/// <reference path="../Header.ts" />

module iignition {
    declare var $i: {
        Options: {
            domainRoot: string;
            spa: boolean;
            controller: boolean;
            controllerPath: string;
            viewPath: string;
            debug: boolean | iignition.LogLevel;
            enableCache: boolean;
            preventDoublePosting: boolean;
            controllerjs: string;
            view: string;
        }
    };

    export class ImageErrorHandler extends Extension {
        // Transparent 1x1 pixel GIF image
        private static TRANSPARENT_IMAGE = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        
        constructor(ctx: any = null) {
            super(ctx);
        }

        handle(ctx: any): Promise<void> {
            return new Promise((resolve, reject) => {
                // Wait a short time to ensure images are loaded/processed
                setTimeout(() => {
                    // Find all images in the document
                    const images = document.querySelectorAll('img');
                    
                    // Process each image
                    images.forEach(img => {
                        // Remove any existing error handlers
                        img.removeEventListener('error', this.handleImageError);
                        
                        // Add error handler for future errors
                        img.addEventListener('error', this.handleImageError);
                        
                        // Check if image is already broken
                        if (!img.complete || img.naturalWidth === 0) {
                            this.handleImageError({ target: img });
                        }
                    });
                    
                    resolve();
                }, 100); // Small delay to allow DOM to update
            });
        }
        
        handleImageError(event): void {
            const img = event.target;
            const originalSrc = img.src;

            // Check if we're on localhost and have a domainRoot
            if (window.location.hostname === 'localhost' && $i.Options.domainRoot) {
                // Create URL objects to compare paths
                const imgUrl = new URL(originalSrc);
                const domainRootUrl = new URL($i.Options.domainRoot);

                // Check if the image URL doesn't already contain the domain root path
                if (!imgUrl.pathname.startsWith(domainRootUrl.pathname)) {
                    // Remove the leading slash if present
                    const cleanPath = imgUrl.pathname.startsWith('/') ? imgUrl.pathname.slice(1) : imgUrl.pathname;
                    
                    // Construct new URL with domain root
                    const newSrc = new URL(cleanPath, $i.Options.domainRoot).toString();
                    
                    // Try loading with the new path
                    img.src = newSrc;
                    return; // Exit early to give the new URL a chance to load
                }
            }
            
            // If we get here, either we're not on localhost, or the prefix didn't help
            // Add a placeholder or class
            img.classList.add('image-error');
            
            // Set transparent image as source
            img.src = ImageErrorHandler.TRANSPARENT_IMAGE;
        }
    }
} 