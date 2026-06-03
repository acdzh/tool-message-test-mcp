// TypeScript 类型系统示例

// 接口与泛型
interface Repository<T extends Entity> {
  findById(id: string): Promise<T | null>;
  findAll(filter?: Partial<T>): Promise<T[]>;
  save(entity: T): Promise<T>;
  delete(id: string): Promise<boolean>;
}

interface Entity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// 枚举
enum TaskStatus {
  Pending = 'PENDING',
  InProgress = 'IN_PROGRESS',
  Completed = 'COMPLETED',
  Cancelled = 'CANCELLED',
}

// 类型别名与联合类型
type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

type EventHandler<T = void> = (event: T) => void | Promise<void>;

// 条件类型与映射类型
type Nullable<T> = { [K in keyof T]: T[K] | null };
type ReadonlyDeep<T> = { readonly [K in keyof T]: T[K] extends object ? ReadonlyDeep<T[K]> : T[K] };

// 类型守卫
interface Cat {
  type: 'cat';
  meow(): void;
}

interface Dog {
  type: 'dog';
  bark(): void;
}

type Pet = Cat | Dog;

function isCat(pet: Pet): pet is Cat {
  return pet.type === 'cat';
}

// 装饰器模式（实验性）
function Logger(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const original = descriptor.value;
  descriptor.value = function (...args: any[]) {
    console.log(`调用方法 ${propertyKey}，参数:`, args);
    const result = original.apply(this, args);
    console.log(`方法 ${propertyKey} 返回:`, result);
    return result;
  };
  return descriptor;
}

// 泛型约束与工具类型
class TaskService implements Repository<Task> {
  private tasks: Map<string, Task> = new Map();

  async findById(id: string): Promise<Task | null> {
    return this.tasks.get(id) ?? null;
  }

  async findAll(filter?: Partial<Task>): Promise<Task[]> {
    let results = Array.from(this.tasks.values());
    if (filter) {
      results = results.filter((task) =>
        Object.entries(filter).every(([key, value]) => task[key as keyof Task] === value)
      );
    }
    return results;
  }

  async save(entity: Task): Promise<Task> {
    this.tasks.set(entity.id, { ...entity, updatedAt: new Date() });
    return entity;
  }

  async delete(id: string): Promise<boolean> {
    return this.tasks.delete(id);
  }
}

interface Task extends Entity {
  title: string;
  status: TaskStatus;
  assignee?: string;
}

// 模板字面量类型
type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type APIRoute = `/${string}`;
type APIEndpoint = `${HTTPMethod} ${APIRoute}`;

// 使用 infer 关键字
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
type ArrayElement<T> = T extends (infer E)[] ? E : never;

export { TaskService, TaskStatus, type Result, type Repository, type Pet };
