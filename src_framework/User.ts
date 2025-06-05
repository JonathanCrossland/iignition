namespace iignition {
    export class User {
        username: string
        roles: string
        isAuthorised: boolean
        picture: string
        email: string

        constructor(username: string, roles: string) {
            this.username = username
            this.roles = roles
            this.isAuthorised = false
        }

        isInRole(role: string): boolean {
            if (!this.isAuthorised) return false
            if (!this.roles) return false
            const roleList = this.roles.split(',').map(r => r.trim())
            return roleList.includes(role)
        }
    }

   

   
} 