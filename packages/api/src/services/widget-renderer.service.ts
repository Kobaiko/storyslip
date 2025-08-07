import { supabase } from '../config/supabase';
import { WidgetConfiguration } from './widget-configuration.service';

export interface RenderedWidget {
  html: string;
  css: string;
  js: string;
  metadata: {
    title: string;
    description: string;
    canonical_url?: string;
    og_tags: Record<string, string>;
    structured_data: any;
  };
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  featured_image?: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  categories: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  tags: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  published_at: string;
  updated_at: string;
  read_time?: number;
  view_count?: number;
}

export class WidgetRendererService {
  /**
   * Render a complete widget with content
   */
  static async renderWidget(
    widgetId: string,
    options: {
      page?: number;
      search?: string;
      category?: string;
      tag?: string;
      author?: string;
    } = {}
  ): Promise<RenderedWidget> {
    try {
      // Get widget configuration
      const { data: widget, error: widgetError } = await supabase
        .from('widget_configurations')
        .select('*')
        .eq('id', widgetId)
        .eq('is_active', true)
        .single();

      if (widgetError || !widget) {
        throw new Error('Widget not found or inactive');
      }

      // Get content based on widget configuration and filters
      const content = await this.getWidgetContent(widget, options);

      // Generate the rendered widget
      const rendered = await this.generateRenderedWidget(widget, content, options);

      return rendered;
    } catch (error) {
      console.error('Error rendering widget:', error);
      throw error;
    }
  }

  /**
   * Get content for widget based on configuration and filters
   */
  private static async getWidgetContent(
    widget: WidgetConfiguration,
    options: {
      page?: number;
      search?: string;
      category?: string;
      tag?: string;
      author?: string;
    }
  ): Promise<{
    posts: BlogPost[];
    totalCount: number;
    categories: Array<{ id: string; name: string; slug: string; count: number }>;
    tags: Array<{ id: string; name: string; slug: string; count: number }>;
    authors: Array<{ id: string; name: string; post_count: number }>;
    heroPost?: BlogPost;
    recentPosts?: BlogPost[];
  }> {
    const { page = 1, search, category, tag, author } = options;
    const { settings, content_filters } = widget;
    const limit = settings.posts_per_page || 12;
    const offset = (page - 1) * limit;

    // Build content query
    let query = supabase
      .from('content')
      .select(`
        id,
        title,
        slug,
        excerpt,
        body,
        featured_image,
        published_at,
        updated_at,
        view_count,
        read_time,
        user:users!inner(id, name, avatar),
        content_categories!inner(
          category:categories!inner(id, name, slug)
        ),
        content_tags(
          tag:tags(id, name, slug)
        )
      `)
      .eq('website_id', widget.website_id)
      .eq('status', 'published')
      .order(content_filters.sort_by || 'published_at', { 
        ascending: content_filters.sort_order === 'asc' 
      });

    // Apply filters
    if (content_filters.published_only) {
      query = query.eq('status', 'published');
    }

    if (content_filters.featured_only) {
      query = query.eq('is_featured', true);
    }

    if (content_filters.include_categories.length > 0) {
      query = query.in('content_categories.category.id', content_filters.include_categories);
    }

    if (content_filters.exclude_categories.length > 0) {
      query = query.not('content_categories.category.id', 'in', `(${content_filters.exclude_categories.join(',')})`);
    }

    if (content_filters.include_tags.length > 0) {
      query = query.in('content_tags.tag.id', content_filters.include_tags);
    }

    if (content_filters.exclude_tags.length > 0) {
      query = query.not('content_tags.tag.id', 'in', `(${content_filters.exclude_tags.join(',')})`);
    }

    if (content_filters.include_authors.length > 0) {
      query = query.in('user_id', content_filters.include_authors);
    }

    if (content_filters.exclude_authors.length > 0) {
      query = query.not('user_id', 'in', `(${content_filters.exclude_authors.join(',')})`);
    }

    // Apply runtime filters
    if (search) {
      query = query.or(`title.ilike.%${search}%,body.ilike.%${search}%,excerpt.ilike.%${search}%`);
    }

    if (category) {
      query = query.eq('content_categories.category.slug', category);
    }

    if (tag) {
      query = query.eq('content_tags.tag.slug', tag);
    }

    if (author) {
      query = query.eq('user.id', author);
    }

    // Get total count
    const { count: totalCount } = await supabase
      .from('content')
      .select('*', { count: 'exact', head: true })
      .eq('website_id', widget.website_id)
      .eq('status', 'published');

    // Get posts with pagination
    const { data: rawPosts, error: postsError } = await query
      .range(offset, offset + limit - 1);

    if (postsError) {
      throw postsError;
    }

    // Transform posts data
    const posts: BlogPost[] = (rawPosts || []).map(post => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      body: post.body,
      featured_image: post.featured_image,
      author: {
        id: post.user.id,
        name: post.user.name,
        avatar: post.user.avatar,
      },
      categories: post.content_categories?.map((cc: any) => cc.category) || [],
      tags: post.content_tags?.map((ct: any) => ct.tag) || [],
      published_at: post.published_at,
      updated_at: post.updated_at,
      read_time: post.read_time,
      view_count: post.view_count,
    }));

    // Get categories with post counts
    const { data: categoriesData } = await supabase
      .from('categories')
      .select(`
        id,
        name,
        slug,
        content_categories(count)
      `)
      .eq('website_id', widget.website_id);

    const categories = (categoriesData || []).map(cat => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      count: cat.content_categories?.length || 0,
    }));

    // Get tags with post counts
    const { data: tagsData } = await supabase
      .from('tags')
      .select(`
        id,
        name,
        slug,
        content_tags(count)
      `)
      .eq('website_id', widget.website_id);

    const tags = (tagsData || []).map(tag => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      count: tag.content_tags?.length || 0,
    }));

    // Get authors with post counts
    const { data: authorsData } = await supabase
      .from('users')
      .select(`
        id,
        name,
        content(count)
      `)
      .eq('content.website_id', widget.website_id);

    const authors = (authorsData || []).map(author => ({
      id: author.id,
      name: author.name,
      post_count: author.content?.length || 0,
    }));

    // Get hero post if configured
    let heroPost: BlogPost | undefined;
    if (settings.show_hero_section && settings.hero_post_id) {
      const { data: heroData } = await supabase
        .from('content')
        .select(`
          id,
          title,
          slug,
          excerpt,
          body,
          featured_image,
          published_at,
          updated_at,
          user:users(id, name, avatar),
          content_categories(
            category:categories(id, name, slug)
          ),
          content_tags(
            tag:tags(id, name, slug)
          )
        `)
        .eq('id', settings.hero_post_id)
        .single();

      if (heroData) {
        heroPost = {
          id: heroData.id,
          title: heroData.title,
          slug: heroData.slug,
          excerpt: heroData.excerpt,
          body: heroData.body,
          featured_image: heroData.featured_image,
          author: {
            id: heroData.user.id,
            name: heroData.user.name,
            avatar: heroData.user.avatar,
          },
          categories: heroData.content_categories?.map((cc: any) => cc.category) || [],
          tags: heroData.content_tags?.map((ct: any) => ct.tag) || [],
          published_at: heroData.published_at,
          updated_at: heroData.updated_at,
        };
      }
    }

    // Get recent posts if configured
    let recentPosts: BlogPost[] | undefined;
    if (settings.show_recent_posts) {
      const { data: recentData } = await supabase
        .from('content')
        .select(`
          id,
          title,
          slug,
          excerpt,
          featured_image,
          published_at,
          user:users(id, name)
        `)
        .eq('website_id', widget.website_id)
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(settings.recent_posts_count || 5);

      recentPosts = (recentData || []).map(post => ({
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        body: '',
        featured_image: post.featured_image,
        author: {
          id: post.user.id,
          name: post.user.name,
        },
        categories: [],
        tags: [],
        published_at: post.published_at,
        updated_at: post.published_at,
      }));
    }

    return {
      posts,
      totalCount: totalCount || 0,
      categories,
      tags,
      authors,
      heroPost,
      recentPosts,
    };
  }

  /**
   * Generate the complete rendered widget
   */
  private static async generateRenderedWidget(
    widget: WidgetConfiguration,
    content: any,
    options: any
  ): Promise<RenderedWidget> {
    const html = this.generateHTML(widget, content, options);
    const css = this.generateCSS(widget);
    const js = this.generateJS(widget, content);
    const metadata = this.generateMetadata(widget, content, options);

    return {
      html,
      css,
      js,
      metadata,
    };
  }

  /**
   * Generate HTML for the widget
   */
  private static generateHTML(
    widget: WidgetConfiguration,
    content: any,
    options: any
  ): string {
    const { settings, type, layout } = widget;
    const { posts, categories, tags, heroPost, recentPosts } = content;

    if (type === 'blog_hub') {
      return this.generateBlogHubHTML(widget, content, options);
    } else if (type === 'content_list') {
      return this.generateContentListHTML(widget, content, options);
    } else if (type === 'featured_posts') {
      return this.generateFeaturedPostsHTML(widget, content, options);
    } else if (type === 'category_grid') {
      return this.generateCategoryGridHTML(widget, content, options);
    }

    return '<div class="storyslip-widget">Widget type not supported</div>';
  }

  /**
   * Generate blog hub HTML - creates a complete blog page
   */
  private static generateBlogHubHTML(
    widget: WidgetConfiguration,
    content: any,
    options: any
  ): string {
    const { settings } = widget;
    const { posts, categories, tags, heroPost, recentPosts } = content;
    const { page = 1, search, category, tag } = options;

    return `
      <div class="storyslip-blog-hub" data-widget-id="${widget.id}">
        <!-- Header Section -->
        <header class="blog-header">
          <div class="container">
            <h1 class="blog-title">Blog</h1>
            ${settings.enable_search ? `
              <div class="blog-search">
                <form class="search-form" role="search">
                  <input 
                    type="search" 
                    class="search-input" 
                    placeholder="Search posts..." 
                    value="${search || ''}"
                    aria-label="Search blog posts"
                  >
                  <button type="submit" class="search-button" aria-label="Search">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="11" cy="11" r="8"></circle>
                      <path d="m21 21-4.35-4.35"></path>
                    </svg>
                  </button>
                </form>
              </div>
            ` : ''}
          </div>
        </header>

        <!-- Hero Section -->
        ${settings.show_hero_section && heroPost ? `
          <section class="blog-hero">
            <div class="container">
              <article class="hero-post">
                ${heroPost.featured_image ? `
                  <div class="hero-image">
                    <img src="${heroPost.featured_image}" alt="${heroPost.title}" loading="lazy">
                  </div>
                ` : ''}
                <div class="hero-content">
                  <div class="hero-meta">
                    ${heroPost.categories.map(cat => `
                      <span class="category-tag">${cat.name}</span>
                    `).join('')}
                    ${settings.show_date ? `
                      <time datetime="${heroPost.published_at}">
                        ${new Date(heroPost.published_at).toLocaleDateString()}
                      </time>
                    ` : ''}
                  </div>
                  <h2 class="hero-title">
                    <a href="/blog/${heroPost.slug}">${heroPost.title}</a>
                  </h2>
                  <p class="hero-excerpt">${heroPost.excerpt}</p>
                  ${settings.show_author ? `
                    <div class="hero-author">
                      ${heroPost.author.avatar ? `
                        <img src="${heroPost.author.avatar}" alt="${heroPost.author.name}" class="author-avatar">
                      ` : ''}
                      <span class="author-name">By ${heroPost.author.name}</span>
                    </div>
                  ` : ''}
                </div>
              </article>
            </div>
          </section>
        ` : ''}

        <!-- Navigation Section -->
        ${settings.show_category_navigation ? `
          <nav class="blog-navigation" aria-label="Blog categories">
            <div class="container">
              <ul class="category-nav">
                <li class="nav-item ${!category ? 'active' : ''}">
                  <a href="?">All Posts</a>
                </li>
                ${categories.map(cat => `
                  <li class="nav-item ${category === cat.slug ? 'active' : ''}">
                    <a href="?category=${cat.slug}">
                      ${cat.name} 
                      ${settings.show_post_count ? `<span class="post-count">(${cat.count})</span>` : ''}
                    </a>
                  </li>
                `).join('')}
              </ul>
            </div>
          </nav>
        ` : ''}

        <!-- Main Content -->
        <main class="blog-main">
          <div class="container">
            <div class="blog-layout">
              <!-- Posts Grid -->
              <section class="posts-section">
                ${settings.enable_filtering ? `
                  <div class="posts-filters">
                    <div class="filter-group">
                      <label for="sort-select">Sort by:</label>
                      <select id="sort-select" class="sort-select">
                        <option value="date-desc">Newest First</option>
                        <option value="date-asc">Oldest First</option>
                        <option value="title-asc">Title A-Z</option>
                        <option value="title-desc">Title Z-A</option>
                      </select>
                    </div>
                  </div>
                ` : ''}

                <div class="posts-grid ${layout}">
                  ${posts.map(post => `
                    <article class="post-card" data-post-id="${post.id}">
                      ${settings.show_featured_image && post.featured_image ? `
                        <div class="post-image">
                          <a href="/blog/${post.slug}">
                            <img src="${post.featured_image}" alt="${post.title}" loading="lazy">
                          </a>
                        </div>
                      ` : ''}
                      
                      <div class="post-content">
                        <div class="post-meta">
                          ${settings.show_categories && post.categories.length > 0 ? `
                            <div class="post-categories">
                              ${post.categories.map(cat => `
                                <a href="?category=${cat.slug}" class="category-link">${cat.name}</a>
                              `).join('')}
                            </div>
                          ` : ''}
                          
                          ${settings.show_date ? `
                            <time class="post-date" datetime="${post.published_at}">
                              ${new Date(post.published_at).toLocaleDateString()}
                            </time>
                          ` : ''}
                          
                          ${settings.show_read_time && post.read_time ? `
                            <span class="read-time">${post.read_time} min read</span>
                          ` : ''}
                        </div>

                        <h3 class="post-title">
                          <a href="/blog/${post.slug}">${post.title}</a>
                        </h3>

                        ${settings.show_excerpts ? `
                          <p class="post-excerpt">${post.excerpt}</p>
                        ` : ''}

                        ${settings.show_author ? `
                          <div class="post-author">
                            ${post.author.avatar ? `
                              <img src="${post.author.avatar}" alt="${post.author.name}" class="author-avatar">
                            ` : ''}
                            <span class="author-name">By ${post.author.name}</span>
                          </div>
                        ` : ''}

                        ${settings.show_tags && post.tags.length > 0 ? `
                          <div class="post-tags">
                            ${post.tags.map(tag => `
                              <a href="?tag=${tag.slug}" class="tag-link">#${tag.name}</a>
                            `).join('')}
                          </div>
                        ` : ''}

                        ${settings.enable_social_sharing ? `
                          <div class="post-actions">
                            <button class="share-button" data-url="/blog/${post.slug}" data-title="${post.title}">
                              Share
                            </button>
                          </div>
                        ` : ''}
                      </div>
                    </article>
                  `).join('')}
                </div>

                <!-- Pagination -->
                ${settings.enable_pagination ? this.generatePagination(content.totalCount, settings.posts_per_page, page) : ''}
              </section>

              <!-- Sidebar -->
              <aside class="blog-sidebar">
                ${settings.show_recent_posts && recentPosts ? `
                  <div class="sidebar-widget recent-posts">
                    <h4 class="widget-title">Recent Posts</h4>
                    <ul class="recent-posts-list">
                      ${recentPosts.map(post => `
                        <li class="recent-post-item">
                          <a href="/blog/${post.slug}" class="recent-post-link">
                            ${post.featured_image ? `
                              <img src="${post.featured_image}" alt="${post.title}" class="recent-post-image">
                            ` : ''}
                            <div class="recent-post-content">
                              <h5 class="recent-post-title">${post.title}</h5>
                              <time class="recent-post-date">${new Date(post.published_at).toLocaleDateString()}</time>
                            </div>
                          </a>
                        </li>
                      `).join('')}
                    </ul>
                  </div>
                ` : ''}

                ${settings.show_tag_cloud && tags.length > 0 ? `
                  <div class="sidebar-widget tag-cloud">
                    <h4 class="widget-title">Popular Tags</h4>
                    <div class="tag-cloud-list">
                      ${tags.map(tag => `
                        <a href="?tag=${tag.slug}" class="tag-cloud-item" style="font-size: ${Math.min(1.5, 0.8 + (tag.count / 10))}rem;">
                          ${tag.name}
                        </a>
                      `).join('')}
                    </div>
                  </div>
                ` : ''}

                ${settings.show_archive_links ? `
                  <div class="sidebar-widget archive-links">
                    <h4 class="widget-title">Archives</h4>
                    <ul class="archive-list">
                      <!-- Archive links would be generated based on post dates -->
                    </ul>
                  </div>
                ` : ''}
              </aside>
            </div>
          </div>
        </main>
      </div>
    `;
  }

  /**
   * Generate content list HTML
   */
  private static generateContentListHTML(
    widget: WidgetConfiguration,
    content: any,
    options: any
  ): string {
    const { settings } = widget;
    const { posts } = content;

    return `
      <div class="storyslip-content-list" data-widget-id="${widget.id}">
        <div class="container">
          <div class="content-list">
            ${posts.map(post => `
              <article class="content-item">
                <div class="content-meta">
                  ${settings.show_date ? `
                    <time datetime="${post.published_at}">
                      ${new Date(post.published_at).toLocaleDateString()}
                    </time>
                  ` : ''}
                  ${settings.show_categories && post.categories.length > 0 ? `
                    <span class="content-category">${post.categories[0].name}</span>
                  ` : ''}
                </div>
                <h3 class="content-title">
                  <a href="/blog/${post.slug}">${post.title}</a>
                </h3>
                ${settings.show_excerpts ? `
                  <p class="content-excerpt">${post.excerpt}</p>
                ` : ''}
                ${settings.show_author ? `
                  <div class="content-author">By ${post.author.name}</div>
                ` : ''}
              </article>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generate featured posts HTML
   */
  private static generateFeaturedPostsHTML(
    widget: WidgetConfiguration,
    content: any,
    options: any
  ): string {
    const { posts } = content;

    return `
      <div class="storyslip-featured-posts" data-widget-id="${widget.id}">
        <div class="container">
          <div class="featured-posts-carousel">
            ${posts.map(post => `
              <div class="featured-post">
                ${post.featured_image ? `
                  <img src="${post.featured_image}" alt="${post.title}">
                ` : ''}
                <div class="featured-content">
                  <h3><a href="/blog/${post.slug}">${post.title}</a></h3>
                  <p>${post.excerpt}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generate category grid HTML
   */
  private static generateCategoryGridHTML(
    widget: WidgetConfiguration,
    content: any,
    options: any
  ): string {
    const { categories } = content;

    return `
      <div class="storyslip-category-grid" data-widget-id="${widget.id}">
        <div class="container">
          <div class="category-grid">
            ${categories.map(category => `
              <div class="category-card">
                <h3><a href="?category=${category.slug}">${category.name}</a></h3>
                <p>${category.count} posts</p>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generate pagination HTML
   */
  private static generatePagination(totalCount: number, postsPerPage: number, currentPage: number): string {
    const totalPages = Math.ceil(totalCount / postsPerPage);
    
    if (totalPages <= 1) return '';

    const pages = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    return `
      <nav class="pagination" aria-label="Blog pagination">
        <ul class="pagination-list">
          ${currentPage > 1 ? `
            <li class="pagination-item">
              <a href="?page=${currentPage - 1}" class="pagination-link" aria-label="Previous page">
                ← Previous
              </a>
            </li>
          ` : ''}
          
          ${startPage > 1 ? `
            <li class="pagination-item">
              <a href="?page=1" class="pagination-link">1</a>
            </li>
            ${startPage > 2 ? '<li class="pagination-ellipsis">...</li>' : ''}
          ` : ''}
          
          ${Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map(page => `
            <li class="pagination-item">
              <a href="?page=${page}" class="pagination-link ${page === currentPage ? 'active' : ''}" ${page === currentPage ? 'aria-current="page"' : ''}>
                ${page}
              </a>
            </li>
          `).join('')}
          
          ${endPage < totalPages ? `
            ${endPage < totalPages - 1 ? '<li class="pagination-ellipsis">...</li>' : ''}
            <li class="pagination-item">
              <a href="?page=${totalPages}" class="pagination-link">${totalPages}</a>
            </li>
          ` : ''}
          
          ${currentPage < totalPages ? `
            <li class="pagination-item">
              <a href="?page=${currentPage + 1}" class="pagination-link" aria-label="Next page">
                Next →
              </a>
            </li>
          ` : ''}
        </ul>
      </nav>
    `;
  }

  /**
   * Generate CSS for the widget
   */
  private static generateCSS(widget: WidgetConfiguration): string {
    const { styling, theme } = widget;

    return `
      /* StorySlip Widget Styles */
      .storyslip-blog-hub {
        font-family: ${styling.font_family || 'system-ui, sans-serif'};
        color: ${styling.text_color || '#1f2937'};
        background-color: ${styling.background_color || '#ffffff'};
        line-height: ${styling.line_height || '1.6'};
      }

      .container {
        max-width: ${styling.container_width || '1200px'};
        margin: 0 auto;
        padding: 0 ${styling.container_padding || '1rem'};
      }

      /* Header Styles */
      .blog-header {
        padding: 2rem 0;
        border-bottom: 1px solid ${styling.border_color || '#e5e7eb'};
      }

      .blog-title {
        font-size: ${styling.heading_font_size || '2.5rem'};
        font-weight: 700;
        margin: 0 0 1rem 0;
        color: ${styling.primary_color || '#3b82f6'};
      }

      .blog-search {
        max-width: 400px;
      }

      .search-form {
        position: relative;
        display: flex;
      }

      .search-input {
        flex: 1;
        padding: 0.75rem 1rem;
        border: 2px solid ${styling.border_color || '#e5e7eb'};
        border-radius: 8px;
        font-size: 1rem;
        transition: border-color 0.2s;
      }

      .search-input:focus {
        outline: none;
        border-color: ${styling.primary_color || '#3b82f6'};
      }

      .search-button {
        position: absolute;
        right: 0.5rem;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        color: ${styling.secondary_color || '#64748b'};
        cursor: pointer;
        padding: 0.5rem;
      }

      /* Hero Styles */
      .blog-hero {
        padding: 3rem 0;
        background: linear-gradient(135deg, ${styling.primary_color || '#3b82f6'}10, ${styling.secondary_color || '#64748b'}10);
      }

      .hero-post {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 2rem;
        align-items: center;
      }

      .hero-image img {
        width: 100%;
        height: 300px;
        object-fit: cover;
        border-radius: ${styling.card_border_radius || '12px'};
      }

      .hero-title {
        font-size: 2rem;
        font-weight: 700;
        margin: 1rem 0;
      }

      .hero-title a {
        color: inherit;
        text-decoration: none;
      }

      .hero-title a:hover {
        color: ${styling.primary_color || '#3b82f6'};
      }

      /* Navigation Styles */
      .blog-navigation {
        padding: 1rem 0;
        background-color: ${styling.background_color || '#ffffff'};
        border-bottom: 1px solid ${styling.border_color || '#e5e7eb'};
      }

      .category-nav {
        display: flex;
        gap: 2rem;
        list-style: none;
        margin: 0;
        padding: 0;
        overflow-x: auto;
      }

      .category-nav .nav-item a {
        color: ${styling.text_color || '#1f2937'};
        text-decoration: none;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        transition: all 0.2s;
        white-space: nowrap;
      }

      .category-nav .nav-item.active a,
      .category-nav .nav-item a:hover {
        background-color: ${styling.primary_color || '#3b82f6'};
        color: white;
      }

      /* Posts Grid */
      .blog-main {
        padding: 3rem 0;
      }

      .blog-layout {
        display: grid;
        grid-template-columns: 1fr 300px;
        gap: 3rem;
      }

      .posts-grid {
        display: grid;
        grid-template-columns: repeat(${styling.grid_columns || 3}, 1fr);
        gap: ${styling.grid_gap || '2rem'};
      }

      .posts-grid.list {
        grid-template-columns: 1fr;
      }

      .posts-grid.masonry {
        columns: ${styling.grid_columns || 3};
        column-gap: ${styling.grid_gap || '2rem'};
      }

      /* Post Card Styles */
      .post-card {
        background: ${styling.card_background || '#ffffff'};
        border-radius: ${styling.card_border_radius || '12px'};
        box-shadow: ${styling.card_shadow || '0 4px 6px -1px rgba(0, 0, 0, 0.1)'};
        padding: ${styling.card_padding || '1.5rem'};
        transition: transform 0.2s, box-shadow 0.2s;
        break-inside: avoid;
        margin-bottom: ${styling.grid_gap || '2rem'};
      }

      .post-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px -5px rgba(0, 0, 0, 0.1);
      }

      .post-image {
        margin: -${styling.card_padding || '1.5rem'} -${styling.card_padding || '1.5rem'} 1rem;
      }

      .post-image img {
        width: 100%;
        height: 200px;
        object-fit: cover;
        border-radius: ${styling.card_border_radius || '12px'} ${styling.card_border_radius || '12px'} 0 0;
      }

      .post-meta {
        display: flex;
        gap: 1rem;
        align-items: center;
        margin-bottom: 1rem;
        font-size: 0.875rem;
        color: ${styling.secondary_color || '#64748b'};
      }

      .category-link {
        background: ${styling.primary_color || '#3b82f6'}20;
        color: ${styling.primary_color || '#3b82f6'};
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        text-decoration: none;
        font-size: 0.75rem;
        font-weight: 500;
      }

      .post-title {
        font-size: 1.25rem;
        font-weight: 600;
        margin: 0 0 1rem 0;
        line-height: 1.4;
      }

      .post-title a {
        color: inherit;
        text-decoration: none;
      }

      .post-title a:hover {
        color: ${styling.primary_color || '#3b82f6'};
      }

      .post-excerpt {
        color: ${styling.secondary_color || '#64748b'};
        margin-bottom: 1rem;
        line-height: 1.6;
      }

      .post-author {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-top: 1rem;
      }

      .author-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        object-fit: cover;
      }

      .post-tags {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        margin-top: 1rem;
      }

      .tag-link {
        color: ${styling.secondary_color || '#64748b'};
        text-decoration: none;
        font-size: 0.875rem;
      }

      .tag-link:hover {
        color: ${styling.primary_color || '#3b82f6'};
      }

      /* Sidebar Styles */
      .blog-sidebar {
        display: flex;
        flex-direction: column;
        gap: 2rem;
      }

      .sidebar-widget {
        background: ${styling.card_background || '#ffffff'};
        border-radius: ${styling.card_border_radius || '12px'};
        padding: ${styling.card_padding || '1.5rem'};
        box-shadow: ${styling.card_shadow || '0 1px 3px 0 rgba(0, 0, 0, 0.1)'};
      }

      .widget-title {
        font-size: 1.125rem;
        font-weight: 600;
        margin: 0 0 1rem 0;
        color: ${styling.primary_color || '#3b82f6'};
      }

      .recent-posts-list {
        list-style: none;
        margin: 0;
        padding: 0;
      }

      .recent-post-item {
        margin-bottom: 1rem;
      }

      .recent-post-link {
        display: flex;
        gap: 0.75rem;
        text-decoration: none;
        color: inherit;
      }

      .recent-post-image {
        width: 60px;
        height: 60px;
        object-fit: cover;
        border-radius: 6px;
        flex-shrink: 0;
      }

      .recent-post-title {
        font-size: 0.875rem;
        font-weight: 500;
        margin: 0 0 0.25rem 0;
        line-height: 1.4;
      }

      .recent-post-date {
        font-size: 0.75rem;
        color: ${styling.secondary_color || '#64748b'};
      }

      .tag-cloud-list {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      .tag-cloud-item {
        background: ${styling.primary_color || '#3b82f6'}10;
        color: ${styling.primary_color || '#3b82f6'};
        padding: 0.25rem 0.75rem;
        border-radius: 20px;
        text-decoration: none;
        font-weight: 500;
        transition: all 0.2s;
      }

      .tag-cloud-item:hover {
        background: ${styling.primary_color || '#3b82f6'};
        color: white;
      }

      /* Pagination Styles */
      .pagination {
        margin-top: 3rem;
      }

      .pagination-list {
        display: flex;
        justify-content: center;
        gap: 0.5rem;
        list-style: none;
        margin: 0;
        padding: 0;
      }

      .pagination-link {
        display: block;
        padding: 0.75rem 1rem;
        color: ${styling.text_color || '#1f2937'};
        text-decoration: none;
        border: 1px solid ${styling.border_color || '#e5e7eb'};
        border-radius: 6px;
        transition: all 0.2s;
      }

      .pagination-link:hover,
      .pagination-link.active {
        background: ${styling.primary_color || '#3b82f6'};
        color: white;
        border-color: ${styling.primary_color || '#3b82f6'};
      }

      /* Responsive Design */
      @media (max-width: 1024px) {
        .blog-layout {
          grid-template-columns: 1fr;
          gap: 2rem;
        }
        
        .posts-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }

      @media (max-width: 768px) {
        .posts-grid {
          grid-template-columns: 1fr;
        }
        
        .hero-post {
          grid-template-columns: 1fr;
        }
        
        .category-nav {
          gap: 1rem;
        }
        
        .blog-title {
          font-size: 2rem;
        }
      }

      /* Custom CSS */
      ${styling.custom_css || ''}
    `;
  }

  /**
   * Generate JavaScript for the widget
   */
  private static generateJS(widget: WidgetConfiguration, content: any): string {
    const { settings } = widget;

    return `
      (function() {
        'use strict';
        
        const widget = {
          id: '${widget.id}',
          settings: ${JSON.stringify(settings)},
          
          init: function() {
            this.bindEvents();
            this.initializeFeatures();
            this.trackAnalytics();
          },
          
          bindEvents: function() {
            // Search functionality
            const searchForm = document.querySelector('.search-form');
            if (searchForm) {
              searchForm.addEventListener('submit', this.handleSearch.bind(this));
            }
            
            // Filter functionality
            const sortSelect = document.querySelector('.sort-select');
            if (sortSelect) {
              sortSelect.addEventListener('change', this.handleSort.bind(this));
            }
            
            // Social sharing
            const shareButtons = document.querySelectorAll('.share-button');
            shareButtons.forEach(button => {
              button.addEventListener('click', this.handleShare.bind(this));
            });
            
            // Infinite scroll
            if (this.settings.enable_infinite_scroll) {
              window.addEventListener('scroll', this.handleInfiniteScroll.bind(this));
            }
          },
          
          handleSearch: function(e) {
            e.preventDefault();
            const searchInput = e.target.querySelector('.search-input');
            const query = searchInput.value.trim();
            
            if (query) {
              const url = new URL(window.location);
              url.searchParams.set('search', query);
              url.searchParams.delete('page');
              window.location.href = url.toString();
            }
          },
          
          handleSort: function(e) {
            const sortValue = e.target.value;
            const url = new URL(window.location);
            url.searchParams.set('sort', sortValue);
            url.searchParams.delete('page');
            window.location.href = url.toString();
          },
          
          handleShare: function(e) {
            const button = e.target;
            const url = button.dataset.url;
            const title = button.dataset.title;
            
            if (navigator.share) {
              navigator.share({
                title: title,
                url: window.location.origin + url
              });
            } else {
              // Fallback to copying URL
              navigator.clipboard.writeText(window.location.origin + url);
              this.showToast('Link copied to clipboard!');
            }
          },
          
          handleInfiniteScroll: function() {
            if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 1000) {
              this.loadMorePosts();
            }
          },
          
          loadMorePosts: function() {
            // Implementation for loading more posts via AJAX
            console.log('Loading more posts...');
          },
          
          initializeFeatures: function() {
            // Lazy loading for images
            if (this.settings.enable_lazy_loading || this.settings.performance_settings?.enable_lazy_loading) {
              this.initLazyLoading();
            }
            
            // Initialize any carousels
            this.initCarousels();
          },
          
          initLazyLoading: function() {
            const images = document.querySelectorAll('img[loading="lazy"]');
            
            if ('IntersectionObserver' in window) {
              const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                  if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src || img.src;
                    img.classList.remove('lazy');
                    observer.unobserve(img);
                  }
                });
              });
              
              images.forEach(img => imageObserver.observe(img));
            }
          },
          
          initCarousels: function() {
            const carousels = document.querySelectorAll('.featured-posts-carousel');
            carousels.forEach(carousel => {
              // Simple carousel implementation
              let currentSlide = 0;
              const slides = carousel.querySelectorAll('.featured-post');
              
              if (slides.length > 1) {
                setInterval(() => {
                  slides[currentSlide].style.display = 'none';
                  currentSlide = (currentSlide + 1) % slides.length;
                  slides[currentSlide].style.display = 'block';
                }, 5000);
              }
            });
          },
          
          trackAnalytics: function() {
            // Track widget view
            this.trackEvent('view');
            
            // Track post clicks
            const postLinks = document.querySelectorAll('.post-title a, .hero-title a');
            postLinks.forEach(link => {
              link.addEventListener('click', () => {
                this.trackEvent('click', { post_id: link.closest('[data-post-id]')?.dataset.postId });
              });
            });
          },
          
          trackEvent: function(eventType, data = {}) {
            // Send analytics data to server
            fetch('/api/widgets/' + this.id + '/analytics/track', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                event_type: eventType,
                data: data,
                timestamp: new Date().toISOString(),
                url: window.location.href,
                referrer: document.referrer,
                user_agent: navigator.userAgent
              })
            }).catch(err => console.log('Analytics tracking failed:', err));
          },
          
          showToast: function(message) {
            const toast = document.createElement('div');
            toast.className = 'storyslip-toast';
            toast.textContent = message;
            toast.style.cssText = \`
              position: fixed;
              top: 20px;
              right: 20px;
              background: #10b981;
              color: white;
              padding: 1rem 1.5rem;
              border-radius: 8px;
              z-index: 1000;
              animation: slideIn 0.3s ease;
            \`;
            
            document.body.appendChild(toast);
            
            setTimeout(() => {
              toast.remove();
            }, 3000);
          }
        };
        
        // Initialize widget when DOM is ready
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () => widget.init());
        } else {
          widget.init();
        }
        
        // Expose widget instance globally for debugging
        window.StorySlipWidget = window.StorySlipWidget || {};
        window.StorySlipWidget['${widget.id}'] = widget;
      })();
    `;
  }

  /**
   * Generate metadata for the widget
   */
  private static generateMetadata(
    widget: WidgetConfiguration,
    content: any,
    options: any
  ): any {
    const { seo_settings } = widget;
    const { posts, categories } = content;
    const { search, category, tag } = options;

    let title = seo_settings.meta_title || 'Blog';
    let description = seo_settings.meta_description || 'Latest blog posts and articles';

    // Customize based on filters
    if (search) {
      title = `Search results for "${search}" - ${title}`;
      description = `Search results for "${search}" in our blog`;
    } else if (category) {
      const categoryName = categories.find(c => c.slug === category)?.name || category;
      title = `${categoryName} - ${title}`;
      description = `Latest posts in ${categoryName}`;
    } else if (tag) {
      title = `#${tag} - ${title}`;
      description = `Posts tagged with ${tag}`;
    }

    const ogTags = {
      'og:title': seo_settings.og_title || title,
      'og:description': seo_settings.og_description || description,
      'og:type': 'website',
      'og:url': seo_settings.canonical_url || '',
    };

    if (seo_settings.og_image) {
      ogTags['og:image'] = seo_settings.og_image;
    }

    const structuredData = seo_settings.structured_data_enabled ? {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      'name': title,
      'description': description,
      'blogPost': posts.map(post => ({
        '@type': 'BlogPosting',
        'headline': post.title,
        'description': post.excerpt,
        'author': {
          '@type': 'Person',
          'name': post.author.name
        },
        'datePublished': post.published_at,
        'dateModified': post.updated_at,
        'url': `/blog/${post.slug}`
      }))
    } : null;

    return {
      title,
      description,
      canonical_url: seo_settings.canonical_url,
      og_tags: ogTags,
      structured_data: structuredData,
    };
  }
}

export default WidgetRendererService;