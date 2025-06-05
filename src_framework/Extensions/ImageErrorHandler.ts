namespace iignition {
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
            
            // Hide the broken image
            //img.hidden = true;
            
            // Optional: Add a placeholder or class
            img.classList.add('image-error');
            
            // Set transparent image as source
            img.src = ImageErrorHandler.TRANSPARENT_IMAGE;
        }
    }
} 