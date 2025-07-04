namespace iignition {
    export class AuthenticationHandler extends Extension {
        constructor(ctx: any = null) {
            super(ctx);
        }

        handle(ctx: any): Promise<void> {
            return new Promise((resolve, reject) => {
                if (!this.Context || !this.Context.selector) {
                    resolve();
                    return;
                }
                
                const elements = document.querySelectorAll(this.Context.selector);
                
                // Early exit if no elements found
                if (elements.length === 0) {
                    resolve();
                    return;
                }
                
                for (let i = 0; i < elements.length; i++) {
                    const element = elements[i] as HTMLElement;
                    
                    // Handle data-role for visibility based on authentication and roles
                    if (element.hasAttribute('data-role')) {
                        const requiredRoles = element.getAttribute('data-role');
                        
                        // Special case: "anon" role means show only when NOT authenticated
                        if (requiredRoles === 'anon') {
                            element.hidden = $i.User.isAuthorised; // Hide if authenticated
                            continue; // Skip to next element (replaces return)
                        }
                        
                        // For all other roles - keep exact original logic
                        if (requiredRoles && requiredRoles.trim() !== '' && $i.User.isAuthorised) {
                            const roles = requiredRoles.split(',');
                            let rolefound = false;
                            for (let j = 0; j < roles.length; j++) {
                                const role = roles[j].trim();
                                if ($i.User.isInRole(role)) {
                                    rolefound = true;
                                    break; // Early exit when role found
                                }
                            }
                            element.hidden = !rolefound; // Hide if role not found
                        }
                        else {
                            element.hidden = true; // Hide if not authenticated or no role match
                        }
                    }
                    // Elements without data-role are completely ignored (original behavior)
                }
                resolve();
            });
        }
    }
} 