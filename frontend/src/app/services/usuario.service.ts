import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Usuario } from '../models/usuario.model';
import { environment } from '../../environments/environment';


// Servicio HTTP del CRUD de usuarios; usa el mismo backend que el login.
@Injectable({
  providedIn: 'root',
})
export class UsuarioService {
  

  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/api/usuarios`;
  
  
  //crud de usuario
  
  //get
  obtenerUsuarios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.url);
  }
  //post
  crearUsuario(usuario: Usuario): Observable<Usuario> {
    return this.http.post<Usuario>(
      this.url, usuario
    );
  }
  //put
  actualizarUsuario(idUsuario: number, usuario: Usuario): Observable<Usuario> {
    return this.http.put<Usuario>(
      `${this.url}/${idUsuario}`, usuario
    );
  }

  //delete
  borrarUsuario(idUsuario: number): Observable<void> {
    return this.http.delete<void>(
      `${this.url}/${idUsuario}`
    );
  }
}
