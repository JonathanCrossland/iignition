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
                elements.forEach(element => {
                    // Handle data-role for visibility based on authentication and roles
                    if (element.hasAttribute('data-role')) {
                        const requiredRoles = element.getAttribute('data-role');
                        
                        // Special case: "anon" role means show only when NOT authenticated
                        if (requiredRoles === 'anon') {
                            element.hidden = $i.User.isAuthorised; // Hide if authenticated
                            return;
                        }
                        
                        // For all other roles
                        if (requiredRoles && requiredRoles.trim() !== '' && $i.User.isAuthorised) {
                            const roles = requiredRoles.split(',').map(r => r.trim());
                            let rolefound = false;
                            for (let role of roles) {
                                if ($i.User.isInRole(role)) {
                                    rolefound = true;
                                    break;
                                }
                            }
                            element.hidden = !rolefound; // Hide if role not found
                        }
                        else {
                            element.hidden = true; // Hide if not authenticated or no role match
                        }
                    }
                });
                resolve();
            });
        }
    }
} 