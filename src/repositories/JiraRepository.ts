import { Inject, Injectable } from '@nestjs/common';
import mysql from 'mysql2';

@Injectable()
export class JiraRepository {
  private connection: mysql.Connection;

  constructor(@Inject('CONNECTION') connection: mysql.Connection) {
    this.connection = connection;
  }

  async selectAll(): Promise<any> {
    return new Promise((res) => {
      const query = `SELECT w.issueID,
          w.author,
          f.finished,
          sum(w.timeworked) timeworked
        FROM worklog w
        INNER JOIN jiraissue i ON i.ID = w.issueID
        INNER JOIN
        (SELECT g.issueid,
          max(g.created) finished
          FROM changeitem i
          INNER JOIN changegroup g ON g.id = i.groupid
          WHERE i.field = 'status'
            AND i.newvalue = 10125
          GROUP BY g.issueid) f ON f.issueid = w.issueid
        WHERE i.PROJECT = 11001
        AND i.issuetype = 10003
        AND i.created >= 2022-04-01
        AND i.issuestatus = 10125
        AND w.issueID in
          (SELECT w.issueID
            FROM worklog w
            INNER JOIN jiraissue i ON i.ID = w.issueID
            WHERE i.PROJECT = 11001
              AND i.issuetype = 10003
              AND i.created >= 2022-04-01
              AND i.issuestatus = 10125
            GROUP BY w.issueID
            HAVING count(DISTINCT w.author) > 1)
        GROUP BY w.issueID ,
                w.author ,
                f.finished
        ORDER BY issueID`;
      this.connection.execute(query, (e, rows) => {
        if (e) throw e;
        res(rows);
      });
    });
  }
}
