import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: { title: 'Meal Planner API', version: '1.0.0' },
    components: {
      securitySchemes: {
        cookieAuth: { type: 'apiKey', in: 'cookie', name: 'token' }
      }
    },
    security: [{ cookieAuth: [] }],
    tags: [
      { name: 'Auth' },
      { name: 'Meals' },
      { name: 'Admin - Users' },
      { name: 'Admin - Schedule' },
      { name: 'Admin - Headcount' },
      { name: 'Admin - WFH' },
    ],
    paths: {
      '/api/auth/login': {
        post: { tags: ['Auth'], summary: 'Login', security: [], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, password: { type: 'string' } } } } } }, responses: { 200: { description: 'Login successful' } } }
      },
      '/api/auth/logout': {
        post: { tags: ['Auth'], summary: 'Logout', responses: { 200: { description: 'Logged out' } } }
      },
      '/api/auth/me': {
        get: { tags: ['Auth'], summary: 'Get current user', responses: { 200: { description: 'Current user info' } } }
      },
      '/api/meals/my-schedule': {
        get: { tags: ['Meals'], summary: 'Get my meal schedule', responses: { 200: { description: 'Meal schedule' } } }
      },
      '/api/meals/my-record': {
        patch: { tags: ['Meals'], summary: 'Add or update my meal record', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { date: { type: 'string' }, lunch: { type: 'boolean' }, snacks: { type: 'boolean' }, iftar: { type: 'boolean' }, eventDinner: { type: 'boolean' }, optionalDinner: { type: 'boolean' }, workFromHome: { type: 'boolean' } } } } } }, responses: { 200: { description: 'Record updated' } } }
      },
      '/api/meals/my-stats': {
        get: { tags: ['Meals'], summary: 'Get my meal stats', responses: { 200: { description: 'Meal stats' } } }
      },
      '/api/admin/users': {
        post: { tags: ['Admin - Users'], summary: 'Create user (Admin)', responses: { 201: { description: 'User created' } } }
      },
      '/api/admin/users/{userId}': {
        get: { tags: ['Admin - Users'], summary: 'Get user (Admin)', parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'User data' } } },
        patch: { tags: ['Admin - Users'], summary: 'Update user (Admin)', parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'User updated' } } },
        delete: { tags: ['Admin - Users'], summary: 'Delete user (Admin)', parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'User deleted' } } }
      },
      '/api/admin/employees': {
        get: { tags: ['Admin - Users'], summary: 'Get all employees (Admin)', responses: { 200: { description: 'Employee list' } } }
      },
      '/api/admin/teams': {
        get: { tags: ['Admin - Users'], summary: 'Get all teams (Admin)', responses: { 200: { description: 'Team list' } } }
      },
      '/api/admin/team/members': {
        get: { tags: ['Admin - Users'], summary: 'Get my team members (Lead/Admin)', responses: { 200: { description: 'Team members' } } }
      },
      '/api/admin/employee/{userId}/schedule': {
        get: { tags: ['Admin - Users'], summary: 'Get employee schedule (Lead/Admin)', parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'Employee schedule' } } }
      },
      '/api/admin/employee/{userId}/record': {
        patch: { tags: ['Admin - Users'], summary: 'Update employee meal record (Lead/Admin)', parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'Record updated' } } }
      },
      '/api/admin/meal-schedule': {
        post: { tags: ['Admin - Schedule'], summary: 'Create meal schedule (Admin)', responses: { 201: { description: 'Schedule created' } } },
        get: { tags: ['Admin - Schedule'], summary: 'Get meal schedule (Admin)', responses: { 200: { description: 'Schedule list' } } }
      },
      '/api/admin/meal-schedule/{id}': {
        delete: { tags: ['Admin - Schedule'], summary: 'Delete meal schedule (Admin)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'Schedule deleted' } } }
      },
      '/api/admin/headcount': {
        get: { tags: ['Admin - Headcount'], summary: 'Get headcount (Admin/Logistics)', responses: { 200: { description: 'Headcount data' } } }
      },
      '/api/admin/daily-participation': {
        get: { tags: ['Admin - Headcount'], summary: 'Get daily participation (Lead/Admin)', responses: { 200: { description: 'Participation data' } } }
      },
      '/api/admin/meals/bulk-update': {
        post: { tags: ['Admin - Headcount'], summary: 'Bulk update meals (Lead/Admin)', responses: { 200: { description: 'Bulk update done' } } }
      },
      '/api/admin/global-wfh': {
        post: { tags: ['Admin - WFH'], summary: 'Create global WFH period (Admin)', responses: { 201: { description: 'WFH period created' } } },
        get: { tags: ['Admin - WFH'], summary: 'Get global WFH periods (Admin)', responses: { 200: { description: 'WFH periods' } } }
      },
      '/api/admin/global-wfh/{id}': {
        delete: { tags: ['Admin - WFH'], summary: 'Delete global WFH period (Admin)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'WFH period deleted' } } }
      },
    }
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);