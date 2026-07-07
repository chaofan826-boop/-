import { sanitizeOperationBody } from './sanitize-body.util';

export type OperationLogInput = {
  actorId: number;
  actorRole: string;
  method: string;
  path: string;
  body?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export function buildOperationLogPayload(input: OperationLogInput) {
  const normalizedPath = input.path.replace(/^\/api/, '') || input.path;
  const sanitizedBody = sanitizeOperationBody(input.body);
  const { module, action, summary } = resolveOperationMeta(
    input.method,
    normalizedPath,
    sanitizedBody,
  );

  return {
    module,
    action,
    summary,
    method: input.method.toUpperCase(),
    path: normalizedPath.slice(0, 255),
    metadata: Object.keys(sanitizedBody).length ? sanitizedBody : null,
  };
}

function resolveOperationMeta(
  method: string,
  path: string,
  body: Record<string, unknown>,
) {
  const upperMethod = method.toUpperCase();

  if (path.startsWith('/auth/logout')) {
    return { module: 'auth', action: 'logout', summary: '退出登录' };
  }
  if (path.startsWith('/auth/password/change')) {
    return { module: 'auth', action: 'change_password', summary: '修改登录密码' };
  }
  if (path.startsWith('/auth/profile/update')) {
    return { module: 'auth', action: 'update_profile', summary: '更新个人资料' };
  }

  if (path.startsWith('/users/admin/create-sub-admin')) {
    return { module: 'sub_admin', action: 'create', summary: '创建子管理员' };
  }
  if (path.startsWith('/users/admin/sub-admins/permissions')) {
    const userId = body.userId;
    return {
      module: 'sub_admin',
      action: 'update_permissions',
      summary: userId ? `更新子管理员 #${userId} 权限` : '更新子管理员权限',
    };
  }
  if (path.startsWith('/users/admin/reset-password')) {
    const userId = body.userId;
    return {
      module: 'users',
      action: 'reset_password',
      summary: userId ? `重置用户 #${userId} 密码` : '重置用户密码',
    };
  }
  if (path.startsWith('/users/admin/update-status')) {
    const userId = body.userId;
    const status = body.status;
    return {
      module: 'users',
      action: 'update_status',
      summary: userId ? `更新用户 #${userId} 状态为 ${status ?? '未知'}` : '更新用户状态',
    };
  }
  if (/^\/users\/\d+$/.test(path) && upperMethod === 'DELETE') {
    const userId = path.split('/').pop();
    return { module: 'users', action: 'delete', summary: `删除用户 #${userId}` };
  }

  if (path.startsWith('/products/create')) {
    return { module: 'products', action: 'create', summary: '创建商品' };
  }
  if (path.startsWith('/products/update')) {
    const id = body.id;
    return {
      module: 'products',
      action: 'update',
      summary: id ? `更新商品 #${id}` : '更新商品',
    };
  }
  if (/^\/products\/\d+\/status$/.test(path)) {
    const id = path.match(/^\/products\/(\d+)\/status$/)?.[1];
    return {
      module: 'products',
      action: 'update_status',
      summary: id ? `更新商品 #${id} 上下架状态` : '更新商品状态',
    };
  }
  if (/^\/products\/\d+$/.test(path) && upperMethod === 'DELETE') {
    const id = path.split('/').pop();
    return { module: 'products', action: 'delete', summary: `删除商品 #${id}` };
  }

  if (path.startsWith('/categories/create')) {
    return { module: 'categories', action: 'create', summary: '创建分类' };
  }
  if (path.startsWith('/categories/update')) {
    const id = body.id;
    return {
      module: 'categories',
      action: 'update',
      summary: id ? `更新分类 #${id}` : '更新分类',
    };
  }
  if (/^\/categories\/\d+$/.test(path) && upperMethod === 'DELETE') {
    const id = path.split('/').pop();
    return { module: 'categories', action: 'delete', summary: `删除分类 #${id}` };
  }

  if (path.startsWith('/banners/create')) {
    return { module: 'banners', action: 'create', summary: '创建轮播图' };
  }
  if (path.startsWith('/banners/update')) {
    const id = body.id;
    return {
      module: 'banners',
      action: 'update',
      summary: id ? `更新轮播图 #${id}` : '更新轮播图',
    };
  }
  if (/^\/banners\/\d+$/.test(path) && upperMethod === 'DELETE') {
    const id = path.split('/').pop();
    return { module: 'banners', action: 'delete', summary: `删除轮播图 #${id}` };
  }

  if (path.startsWith('/promotions/create') || path.startsWith('/promotions/flash-sale/create')) {
    return { module: 'promotions', action: 'create', summary: '创建营销活动' };
  }
  if (path.startsWith('/promotions/update') || path.startsWith('/promotions/flash-sale/update')) {
    const id = body.id;
    return {
      module: 'promotions',
      action: 'update',
      summary: id ? `更新营销活动 #${id}` : '更新营销活动',
    };
  }
  if (/^\/promotions\/\d+$/.test(path) && upperMethod === 'DELETE') {
    const id = path.split('/').pop();
    return { module: 'promotions', action: 'delete', summary: `删除营销活动 #${id}` };
  }

  if (path.startsWith('/orders/update-status')) {
    const orderNo = body.orderNo;
    return {
      module: 'orders',
      action: 'update_status',
      summary: orderNo ? `更新订单 ${orderNo} 状态` : '更新订单状态',
    };
  }
  if (/^\/orders\/\d+$/.test(path) && upperMethod === 'DELETE') {
    const id = path.split('/').pop();
    return { module: 'orders', action: 'delete', summary: `删除订单 #${id}` };
  }
  if (path.startsWith('/shipping/create')) {
    return { module: 'orders', action: 'ship', summary: '创建物流发货' };
  }

  if (path.startsWith('/chat/quick-replies/create')) {
    return { module: 'chat', action: 'create', summary: '创建客服话术' };
  }
  if (path.startsWith('/chat/quick-replies/update')) {
    const id = body.id;
    return {
      module: 'chat',
      action: 'update',
      summary: id ? `更新客服话术 #${id}` : '更新客服话术',
    };
  }
  if (/^\/chat\/quick-replies\/\d+$/.test(path) && upperMethod === 'DELETE') {
    const id = path.split('/').pop();
    return { module: 'chat', action: 'delete', summary: `删除客服话术 #${id}` };
  }
  if (/^\/chat\/conversations\/\d+\/messages$/.test(path)) {
    return { module: 'chat', action: 'send_message', summary: '发送客服消息' };
  }

  if (path.startsWith('/upload/')) {
    return { module: 'upload', action: 'upload', summary: '上传文件' };
  }

  const shortPath = path.length > 48 ? `${path.slice(0, 48)}...` : path;
  return {
    module: 'system',
    action: upperMethod.toLowerCase(),
    summary: `${upperMethod} ${shortPath}`,
  };
}
