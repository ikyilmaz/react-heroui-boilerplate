import { compileGetter } from './functions/compileGetter'
import { normalizeLoadResult } from './functions/normalizeLoadResult'
import { queryByOptions } from './functions/queryByOptions'
import { StoreEventEmitter } from './StoreEventEmitter'
import type { CustomStoreOptions } from './types/CustomStoreOptions'
import type { DataChange } from './types/DataChange'
import type { LoadOptions } from './types/LoadOptions'
import type { LoadResult } from './types/LoadResult'
import type { RowKey } from './types/RowKey'
import type { Store } from './types/Store'

/** Store backed by your own functions (usually HTTP calls), like DevExtreme's `CustomStore`. */
export class CustomStore<TRow> extends StoreEventEmitter implements Store<TRow> {
  readonly #options: CustomStoreOptions<TRow>

  constructor(options: CustomStoreOptions<TRow>) {
    super()
    this.#options = options
  }

  key(): string | undefined {
    return this.#options.key
  }

  keyOf(item: TRow): RowKey | undefined {
    if (!this.#options.key) return undefined
    return compileGetter<TRow>(this.#options.key)(item) as RowKey | undefined
  }

  async load(options: LoadOptions<TRow> = {}): Promise<LoadResult<TRow>> {
    this.emit('loading', options)
    if (this.#options.loadMode === 'raw') {
      const all = normalizeLoadResult(await this.#options.load({})).data
      const result = queryByOptions(all, options)
      this.emit('loaded', result)
      return result
    }
    const result = await this.#options.load(options)
    this.emit('loaded', result)
    return result
  }

  async byKey(key: RowKey): Promise<TRow | undefined> {
    if (this.#options.byKey) return this.#options.byKey(key)
    const all = normalizeLoadResult(await this.#options.load({})).data
    return all.find((i) => this.keyOf(i) === key)
  }

  async insert(values: Partial<TRow>): Promise<TRow> {
    if (!this.#options.insert) throw new Error('E4012: the "insert" function is not implemented')
    this.emit('inserting', values)
    const item = await this.#options.insert(values)
    this.emit('inserted', item, this.keyOf(item))
    this.#modified()
    return item
  }

  async update(key: RowKey, values: Partial<TRow>): Promise<TRow> {
    if (!this.#options.update) throw new Error('E4012: the "update" function is not implemented')
    this.emit('updating', key, values)
    const item = (await this.#options.update(key, values)) ?? (values as TRow)
    this.emit('updated', key, values)
    this.#modified()
    return item
  }

  async remove(key: RowKey): Promise<void> {
    if (!this.#options.remove) throw new Error('E4012: the "remove" function is not implemented')
    this.emit('removing', key)
    await this.#options.remove(key)
    this.emit('removed', key)
    this.#modified()
  }

  /** Announces changes made elsewhere; the grid reloads. */
  push(changes: DataChange<TRow>[]): void {
    this.emit('push', changes)
    this.#modified()
  }

  #modified(): void {
    this.#options.onModified?.()
    this.emit('modified')
  }
}
