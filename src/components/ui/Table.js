export const table = ({ head = '', body = '', className = '' } = {}) => `
  <div class="table-wrap ${className}">
    <table class="data-table">
      ${head ? `<thead>${head}</thead>` : ''}
      ${body ? `<tbody>${body}</tbody>` : ''}
    </table>
  </div>
`;

