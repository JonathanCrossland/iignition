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

                let newPath = imgUrl.pathname;
                let shouldRetry = false;

                // Check if there's a ~ in the path - replace it with domainRootUrl.pathname
                if (imgUrl.pathname.includes('~')) {
                    // Replace ~ with the domain root path, ensuring no double slashes
                    const domainPath = domainRootUrl.pathname.endsWith('/') ? domainRootUrl.pathname.slice(0, -1) : domainRootUrl.pathname;
                    newPath = imgUrl.pathname.replace('~', domainPath);
                    shouldRetry = true;
                } else if (!newPath.startsWith(domainRootUrl.pathname)) {
                    // Check if the path doesn't already contain the domain root path
                    // Remove the leading slash if present
                    const cleanPath = newPath.startsWith('/') ? newPath.slice(1) : newPath;
                    
                    // Construct path with domain root, ensuring no double slashes
                    const domainPath = domainRootUrl.pathname.endsWith('/') ? domainRootUrl.pathname : domainRootUrl.pathname + '/';
                    newPath = domainPath + cleanPath;
                    shouldRetry = true;
                }

                // If we have a new path to try
                if (shouldRetry) {
                    // Construct new URL with the corrected path
                    const newUrl = new URL(imgUrl);
                    newUrl.pathname = newPath;
                    
                    // Try loading with the new path
                    img.src = newUrl.toString();
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