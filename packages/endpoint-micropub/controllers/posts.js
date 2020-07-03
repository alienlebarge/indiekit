export const postsController = publication => ({
  /**
   * Return previously published posts
   *
   * @param {object} request HTTP request
   * @param {object} response HTTP response
   * @param {Function} next Next middleware callback
   * @returns {object} HTTP response
   */
  view: async (request, response, next) => {
    try {
      const posts = await publication.posts.selectFromAll('mf2');

      response.render('posts', {
        title: 'Posts',
        posts
      });
    } catch (error) {
      next(error);
    }
  }
});
